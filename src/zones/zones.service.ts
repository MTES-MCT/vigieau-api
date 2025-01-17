import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, MoreThan, Repository } from 'typeorm';
import computeBbox from '@turf/bbox';
import { VigieauLogger } from '../logger/vigieau.logger';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { keyBy } from 'lodash';
import { ZoneAlerteComputed } from './entities/zone_alerte_computed.entity';
import { DepartementsService } from '../departements/departements.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ZoneDto } from './dto/zone.dto';
import { StatisticsService } from '../statistics/statistics.service';
import { DataService } from '../data/data.service';
import { ArreteMunicipal } from './entities/arrete_municipal.entity';
import { CommunesService } from '../communes/communes.service';
import { Commune } from './entities/commune.entity';
import { Config } from './entities/config.entity';

@Injectable()
export class ZonesService {
  private readonly logger = new VigieauLogger('ZonesService');

  allZonesWithRestrictions: any[] = [];
  communeArretesMunicipaux: Commune[];
  zonesFeatures: any = [];
  zonesIndex: any = {};
  zonesCommunesIndex: any = {};
  zoneTree;
  lastUpdate = null;
  lastUpdateAm = null;
  loading = false;

  constructor(@InjectRepository(ZoneAlerteComputed)
              private readonly zoneAlerteComputedRepository: Repository<ZoneAlerteComputed>,
              private readonly departementsService: DepartementsService,
              private readonly statisticsService: StatisticsService,
              private readonly dataService: DataService,
              private readonly communesService: CommunesService,
              @InjectRepository(ArreteMunicipal)
              private readonly arreteMunicipalRepository: Repository<ArreteMunicipal>,
              @InjectRepository(Config)
              private readonly configRepository: Repository<Config>) {
    this.loadAllZones(true);
  }

  /**
   * Recherche les zones d'alerte en fonction des coordonnées (lon/lat) ou du code commune.
   * @param queryLon - Longitude
   * @param queryLat - Latitude
   * @param commune - Code commune INSEE
   * @param profil - Profil utilisateur
   * @param zoneType - Type de zone
   */
  find(queryLon?: string, queryLat?: string, commune?: string, profil?: string, zoneType?: string): any[] {
    if (queryLon && queryLat) {
      const lon = parseFloat(queryLon);
      const lat = parseFloat(queryLat);

      if (isNaN(lon) || isNaN(lat) || lon <= -180 || lon >= 180 || lat <= -85 || lat >= 85) {
        throw new HttpException(
          `lon/lat are not valid.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const zones = this.searchZonesByLonLat({ lon, lat });
      return this.formatZones(zones, profil, zoneType, commune);
    }

    if (commune) {
      const zones = this.searchZonesByCommune(commune);
      return this.formatZones(zones, profil, zoneType, commune);
    }

    throw new HttpException(
      `Les paramètres lon/lat ou commune sont requis.`,
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * Recherche une zone d'alerte par son ID.
   * @param id - Identifiant unique de la zone
   * @returns La zone formatée ou une exception si introuvable
   */
  async findOne(id: number): Promise<any> {
    const z = this.allZonesWithRestrictions.find(zone => zone.id === id);
    if (z) {
      return this.formatZone(z);
    }

    throw new HttpException(
      `Aucune zone d’alerte en vigueur ne correspond à cet identifiant.`,
      HttpStatus.NOT_FOUND,
    );
  }

  /**
   * Recherche les zones d'un département donné.
   * @param depCode - Code du département
   * @returns Liste des zones formatées ou une exception si aucune zone n'est trouvée
   */
  async findByDepartement(depCode: string): Promise<any> {
    const zones = this.allZonesWithRestrictions.filter(zone => zone.departement === depCode);
    if (zones.length > 0) {
      return zones.map(z => this.formatZone(z));
    }

    throw new HttpException(
      `Aucune zone d’alerte en vigueur sur ce département.`,
      HttpStatus.NOT_FOUND,
    );
  }

  /**
   * Recherche les zones en fonction des coordonnées géographiques (lon/lat).
   * @param coords - Coordonnées géographiques
   * @param allowMultiple - Autoriser plusieurs zones du même type
   * @returns Les zones correspondant aux coordonnées
   */
  searchZonesByLonLat(coords: { lon: number; lat: number }, allowMultiple = false): any[] {
    const { lon, lat } = coords;
    const zones = this.zoneTree
      .search(lon, lat, lon, lat)
      .map(idx => this.zonesFeatures[idx])
      .filter(feature => booleanPointInPolygon([lon, lat], feature))
      .map(feature => this.zonesIndex[feature.properties.idZone]);

    const zoneCounts = { SUP: 0, SOU: 0, AEP: 0 };
    zones.forEach(zone => {
      if (!zone.ressourceInfluencee) {
        zoneCounts[zone.type]++;
      }
    });

    if (!allowMultiple && (zoneCounts.SUP > 1 || zoneCounts.SOU > 1 || zoneCounts.AEP > 1)) {
      throw new HttpException(
        `Un problème avec les données ne permet pas de répondre à votre demande.`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return zones;
  }

  /**
   * Recherche les zones associées à une commune donnée.
   * @param commune - Code commune INSEE
   * @param allowMultiple - Autoriser plusieurs zones du même type
   * @returns Les zones correspondant à la commune
   */
  searchZonesByCommune(commune, allowMultiple = false) {
    const zones = this.zonesCommunesIndex[commune];
    const zoneCounts = { SUP: 0, SOU: 0, AEP: 0 };
    zones.forEach(zone => {
      if (!zone.ressourceInfluencee) {
        zoneCounts[zone.type]++;
      }
    });

    if (!allowMultiple && (zoneCounts.SUP > 1 || zoneCounts.SOU > 1 || zoneCounts.AEP > 1)) {
      throw new HttpException(`La commune comporte plusieurs zones d’alerte de même type.`, HttpStatus.CONFLICT);
    }

    return zones;
  }

  /**
   * Charge toutes les zones et les communes associées.
   * @param onInit - Indique si le chargement est effectué à l'initialisation
   */
  async loadAllZones(onInit = false): Promise<void> {
    this.loading = true;
    try {
      this.logger.log('LOADING ALL ZONES & COMMUNES - BEGIN');

      const zonesWithGeom = await this.loadZones(); // Étape 1 : Charger les zones avec leurs restrictions.
      await this.loadZonesRestrictions(zonesWithGeom); // Étape 2 : Associer les zones à leurs restrictions.
      await this.loadZonesCommunes(zonesWithGeom); // Étape 3 : Associer les zones à leurs communes.

      // @ts-ignore
      this.allZonesWithRestrictions = zonesWithGeom.map(z => {
        const usages = z.restriction?.usages?.filter(u => {
          if (z.type === 'SUP') {
            return u.concerneEsu;
          } else if (z.type === 'SOU') {
            return u.concerneEso;
          } else if (z.type === 'AEP') {
            return u.concerneAep;
          }
          return true;
        });
        return {
          id: z.id,
          idSandre: z.idSandre,
          code: z.code,
          nom: z.nom,
          type: z.type,
          ressourceInfluencee: z.ressourceInfluencee,
          niveauGravite: z.niveauGravite,
          departement: z.restriction?.arreteRestriction?.departement?.code,
          arrete: {
            id: z.restriction?.arreteRestriction?.id,
            dateDebutValidite: z.restriction?.arreteRestriction?.dateDebut,
            dateFinValidite: z.restriction?.arreteRestriction?.dateFin,
            cheminFichier: z.restriction?.arreteRestriction?.fichier?.url,
            cheminFichierArreteCadre: z.restriction?.arreteCadre?.fichier?.url,
          },
          usages: usages?.map(u => {
            let description = '';
            switch (z.niveauGravite) {
              case 'vigilance':
                description = u.descriptionVigilance;
                break;
              case 'alerte':
                description = u.descriptionAlerte;
                break;
              case 'alerte_renforcee':
                description = u.descriptionAlerteRenforcee;
                break;
              case 'crise':
                description = u.descriptionCrise;
                break;
            }
            return {
              id: u.id,
              nom: u.nom,
              thematique: u.thematique.nom,
              description: description,
              concerneParticulier: u.concerneParticulier,
              concerneEntreprise: u.concerneEntreprise,
              concerneCollectivite: u.concerneCollectivite,
              concerneExploitation: u.concerneExploitation,
            };
          }),
        };
      });

      await this.buildZoneTree(zonesWithGeom); // Étape 4 : Construire une structure pour les recherches rapides.
      await this.updateArreteMunicipaux(); // Étape 5 : Mettre à jour les arrêtés municipaux.

      this.loading = false;
      this.logger.log('LOADING ALL ZONES & COMMUNES - END');
      this.departementsService.loadSituation(this.allZonesWithRestrictions);
    } catch (e) {
      this.logger.error('LOADING ALL ZONES & COMMUNES - ERROR', e);
    } finally {
      this.loading = false;
    }
    if (onInit) {
      this.statisticsService.loadStatistics();
      this.dataService.loadData();
    }
  }

  /**
   * Étape 1 : Charger les zones avec leurs restrictions depuis la base de données.
   */
  private async loadZones(): Promise<any[]> {
    this.logger.log('LOADING ZONES WITH RESTRICTIONS');
    const rawZones = await this.zoneAlerteComputedRepository
      .createQueryBuilder('zone_alerte_computed')
      .select('zone_alerte_computed.id', 'id')
      .addSelect('zone_alerte_computed.idSandre', 'idSandre')
      .addSelect('zone_alerte_computed.code', 'code')
      .addSelect('zone_alerte_computed.nom', 'nom')
      .addSelect('zone_alerte_computed.type', 'type')
      .addSelect('zone_alerte_computed.ressourceInfluencee', 'ressourceInfluencee')
      .addSelect('zone_alerte_computed.niveauGravite', 'niveauGravite')
      .addSelect(
        'ST_AsGeoJSON(ST_TRANSFORM(zone_alerte_computed.geom, 4326))',
        'geom',
      )
      .getRawMany();

    this.lastUpdate = new Date();

    // Mapping initial des zones avec des restrictions vides pour les enrichir plus tard.
    const toReturn = rawZones.map(zone => ({
      ...zone,
      communes: [],
      restriction: [],
    }));

    this.logger.log(`${rawZones.length} zones loaded.`);
    return toReturn;
  }

  /**
   * Étape 2 : Charger les restrictions associées à chaque zone.
   */
  private async loadZonesRestrictions(zones: any[]): Promise<void> {
    this.logger.log('LOADING ALL ZONES & COMMUNES - MAPPING RESTRICTION');

    const batchSize = 1000;
    for (let i = 0; i < zones.length; i += batchSize) {
      const batch = zones.slice(i, i + batchSize);
      this.logger.log(`LOADING ALL ZONES & COMMUNES - MAPPING RESTRICTION - BATCH ${i}`);
      await Promise.all(batch.map(async (zone) => {
        const z = await this.zoneAlerteComputedRepository.findOne(<FindOneOptions>{
          where: {
            id: zone.id,
            restriction: {
              arreteRestriction: {
                statut: 'publie',
              },
            },
          },
          relations: [
            'restriction',
            'restriction.arreteRestriction',
            'restriction.arreteRestriction.fichier',
            'restriction.arreteRestriction.departement',
            'restriction.arreteCadre',
            'restriction.arreteCadre.fichier',
            'restriction.usages',
            'restriction.usages.thematique',
          ],
        });
        zone.restriction = z ? z.restriction : [];
        return zone;
      }));
    }
  }

  /**
   * Étape 3 : Charger les communes associées à chaque zone.
   */
  private async loadZonesCommunes(zones: any[]): Promise<void> {
    this.logger.log('LOADING ALL ZONES & COMMUNES - MAPPING COMMUNES');
    const batchSize = 1000;

    for (let i = 0; i < zones.length; i += batchSize) {
      const batch = zones.slice(i, i + batchSize);

      this.logger.log(`LOADING ALL ZONES & COMMUNES - MAPPING COMMUNE - BATCH ${i}`);
      await Promise.all(
        batch.map(async zone => {
          const z = await this.zoneAlerteComputedRepository.findOne({
            where: { id: zone.id },
            relations: ['communes'],
          });
          zone.communes = z ? z.communes : [];
        }),
      );
    }
  }

  /**
   * Étape 4 : Construire une structure optimisée pour les recherches spatiales.
   */
  private async buildZoneTree(zones: any[]): Promise<void> {
    // Import dynamique de Flatbush pour éviter les problèmes avec SSR.
    // @ts-ignore
    const Flatbush = (await import('flatbush')).default;

    this.zoneTree = new Flatbush(this.allZonesWithRestrictions.length);
    this.zonesFeatures = [];
    this.zonesCommunesIndex = {};
    this.zonesIndex = keyBy(this.allZonesWithRestrictions, 'id');

    for (const zone of this.allZonesWithRestrictions) {
      const fullZone = zones.find(z => z.id === zone.id);
      const geojson = JSON.parse(fullZone.geom);
      geojson.properties = {
        idZone: zone.id,
        code: zone.code,
        nom: zone.nom,
        type: zone.type,
        ressourceInfluencee: zone.ressourceInfluencee,
        niveauGravite: zone.niveauGravite,
      };

      const bbox = computeBbox(geojson);
      this.zonesFeatures.push(geojson);
      this.zoneTree.add(...bbox);

      for (const commune of fullZone.communes) {
        if (!this.zonesCommunesIndex[commune.code]) {
          this.zonesCommunesIndex[commune.code] = [];
        }
        this.zonesCommunesIndex[commune.code].push(zone);
      }
    }

    this.zoneTree.finish();
    this.logger.log('ZONE TREE BUILT');
  }

  /**
   * Étape 5 : Mettre à jour les arrêtés municipaux.
   */
  private async updateArreteMunicipaux(): Promise<void> {
    this.logger.log('MISE A JOUR DES ARRETES MUNICIPAUX');
    this.lastUpdateAm = new Date();
    this.communeArretesMunicipaux = await this.communesService.findArretesMunicipaux();
    this.logger.log(`LOADED ${this.communeArretesMunicipaux?.length} ARRETES MUNICIPAUX.`);
  }

  /**
   * Formate une liste de zones d'alerte.
   * @param zones - Liste des zones à formater
   * @param profil - Profil utilisateur pour filtrer les usages
   * @param zoneType - Type de zone spécifique à sélectionner (facultatif)
   * @param commune - Code commune pour récupérer les arrêtés municipaux (facultatif)
   * @returns Liste des zones formatées ou une zone unique si `zoneType` est fourni
   */
  formatZones(zones: any[], profil?: string, zoneType?: string, commune?: string): any[] {
    if (!zones || zones.length === 0) {
      return [];
    }

    const communeArreteMunicipal = commune ?
      this.communeArretesMunicipaux?.find(c => c.code === this.communesService.normalizeCodeCommune(commune))?.arretesMunicipaux[0]
      : null;

    if (zoneType) {
      const toReturn = zones.find(z => z.type === zoneType);
      return toReturn ? [this.formatZone(toReturn, profil, communeArreteMunicipal)] : [];
    }

    const formattedZones = zones.map(z => this.formatZone(z, profil, communeArreteMunicipal));

    if (communeArreteMunicipal?.fichier?.url) {
      ['AEP', 'SOU', 'SUP'].forEach(zoneType => {
        if (!formattedZones.some(zone => zone.type === zoneType)) {
          formattedZones.push({
            id: null,
            type: zoneType,
            arreteMunicipalCheminFichier: communeArreteMunicipal.fichier.url,
          });
        }
      });
    }

    return formattedZones;
  }

  /**
   * Formate une zone d'alerte individuelle.
   * @param zone - La zone à formater
   * @param profil - Profil utilisateur pour filtrer les usages (facultatif)
   * @param arreteMunicipal - Arrêté municipal associé à la zone (facultatif)
   * @returns La zone formatée
   */
  formatZone(zone: any, profil?: string, arreteMunicipal?: ArreteMunicipal) {
    if (!zone) {
      return arreteMunicipal?.fichier?.url
        ? { id: null, arreteMunicipalCheminFichier: arreteMunicipal.fichier.url }
        : null;
    }

    // Ajout de l'arrêté municipal si présent
    const formattedZone = {
      ...zone,
      arreteMunicipalCheminFichier: arreteMunicipal?.fichier?.url || zone.arreteMunicipalCheminFichier,
    };

    // Filtrage des usages en fonction du profil
    if (profil && Array.isArray(zone.usages)) {
      formattedZone.usages = zone.usages.filter(u => {
        const mapping = {
          particulier: u.concerneParticulier,
          entreprise: u.concerneEntreprise,
          exploitation: u.concerneExploitation,
          collectivite: u.concerneCollectivite,
        };
        return mapping[profil];
      });
    }

    // Duplication des attributs pour être ISO SANDRE
    return {
      ...formattedZone,
      gid: zone.idSandre,
      CdZAS: zone.code,
      LbZAS: zone.nom,
      TypeZAS: zone.type,
    };
  }

  /**
   * Vérification régulière s'il n'y a pas de nouvelles zones
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async updateZones(): Promise<void> {
    if (this.loading || !this.lastUpdate) {
      return;
    }
    const count = await this.configRepository
      .createQueryBuilder('config')
      .where({
        computeZoneAlerteComputedDate: MoreThan(this.lastUpdate.toLocaleString('sv')),
      })
      .getCount();
    if (count > 0) {
      this.loadAllZones();
    }
    return;
  }

  /**
   * Vérification régulière s'il n'y a pas de nouveaaux arrêtés municipaux
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async updateArretesMunicipaux(): Promise<void> {
    if (!this.lastUpdateAm) {
      return;
    }
    const count = await this.arreteMunicipalRepository
      .createQueryBuilder('arrete_municipal')
      .where({
        updated_at: MoreThan(this.lastUpdateAm.toLocaleString('sv')),
      })
      .getCount();
    if (count > 0) {
      this.updateArreteMunicipaux();
    }
  }
}
