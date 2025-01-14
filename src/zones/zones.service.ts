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

  allZonesWithRestrictions: ZoneDto[] = [];
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

  find(queryLon?: string, queryLat?: string, commune?: string, profil?: string, zoneType?: string) {
    if (queryLon && queryLat) {
      const lon = Number.parseFloat(queryLon);
      const lat = Number.parseFloat(queryLat);

      if (Number.isNaN(lon) || Number.isNaN(lat) || lon <= -180 || lon >= 180 || lat <= -85 || lat >= 85) {
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

  async findOne(id: string) {
    const z = this.allZonesWithRestrictions.find(zone => zone.id === +id);
    if (z) {
      return this.formatZone(z);
    }

    throw new HttpException(
      `Aucune zone d’alerte en vigueur ne correspond à cet identifiant.`,
      HttpStatus.NOT_FOUND,
    );
  }

  async findByDepartement(depCode: string) {
    const zones = this.allZonesWithRestrictions.filter(zone => zone.departement === depCode);
    if (zones.length > 0) {
      return zones.map(z => this.formatZone(z));
    }

    throw new HttpException(
      `Aucune zone d’alerte en vigueur sur ce département.`,
      HttpStatus.NOT_FOUND,
    );
  }

  searchZonesByLonLat({ lon, lat }, allowMultiple = false) {
    const zones = this.zoneTree.search(lon, lat, lon, lat)
      .map(idx => this.zonesFeatures[idx])
      .filter(feature => booleanPointInPolygon([lon, lat], feature))
      .map(feature => this.zonesIndex[feature.properties.idZone]);

    const sup = zones.filter(z => !z.ressourceInfluencee && z.type === 'SUP');
    const sou = zones.filter(z => !z.ressourceInfluencee && z.type === 'SOU');
    const aep = zones.filter(z => !z.ressourceInfluencee && z.type === 'AEP');

    if (sup.length <= 1 && sou.length <= 1 && aep.length <= 1) {
      return zones;
    }

    if (!allowMultiple) {
      throw new HttpException(
        `Un problème avec les données ne permet pas de répondre à votre demande.`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return zones;
  }

  searchZonesByCommune(commune, allowMultiple = false) {
    const zones = this.zonesCommunesIndex[commune];

    if (!zones) {
      return [];
    }

    const sup = zones.filter(z => !z.ressourceInfluencee && z.type === 'SUP');
    const sou = zones.filter(z => !z.ressourceInfluencee && z.type === 'SOU');
    const aep = zones.filter(z => !z.ressourceInfluencee && z.type === 'AEP');

    if (sup.length <= 1 && sou.length <= 1 && aep.length <= 1) {
      return zones;
    }

    if (!allowMultiple) {
      throw new HttpException(
        `La commune comporte plusieurs zones d’alerte de même type.`,
        HttpStatus.CONFLICT,
      );
    }

    return zones;
  }

  async loadAllZones(onInit = false) {
    this.loading = true;
    try {
      this.logger.log('LOADING ALL ZONES & COMMUNES - BEGIN');
      // @ts-ignore
      const Flatbush = (await import('flatbush')).default;

      const zonesWithRestrictions = await this.zoneAlerteComputedRepository
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

      this.logger.log('LOADING ALL ZONES & COMMUNES - MAPPING RESTRICTION');

      const batchSize = 1000;
      for (let i = 0; i < zonesWithRestrictions.length; i += batchSize) {
        this.logger.log(`LOADING ALL ZONES & COMMUNES - MAPPING RESTRICTION - BATCH ${i}`);
        await Promise.all(zonesWithRestrictions.slice(i, i + batchSize).map(async (zone) => {
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

      this.logger.log('LOADING ALL ZONES & COMMUNES - MAPPING COMMUNES');

      for (let i = 0; i < zonesWithRestrictions.length; i += batchSize) {
        this.logger.log(`LOADING ALL ZONES & COMMUNES - MAPPING COMMUNES - BATCH ${i}`);
        await Promise.all(zonesWithRestrictions.slice(i, i + batchSize).map(async (zone) => {
          const z = await this.zoneAlerteComputedRepository.findOne({
            where: {
              id: zone.id,
            },
            relations: [
              'communes',
            ],
          });
          zone.communes = z ? z.communes : [];
          return zone;
        }));
      }

      // @ts-ignore
      this.allZonesWithRestrictions = zonesWithRestrictions.map(z => {
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


      this.logger.log(`LOADING ALL ZONES & COMMUNES - COMPUTING ${zonesWithRestrictions.length} zones`);
      this.zoneTree = new Flatbush(this.allZonesWithRestrictions.length);
      this.zonesFeatures = [];
      this.zonesCommunesIndex = {};
      this.zonesIndex = {};
      for (const zone of this.allZonesWithRestrictions) {
        const fullZone = zonesWithRestrictions.find(z => z.id === zone.id);
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
      this.zonesIndex = keyBy(this.allZonesWithRestrictions, 'id');
      this.zoneTree.finish();

      await this.updateArreteMunicipaux();

      this.loading = false;
      this.logger.log('LOADING ALL ZONES & COMMUNES - END');
      this.departementsService.loadSituation(this.allZonesWithRestrictions);
    } catch (e) {
      this.loading = false;
      this.logger.error('LOADING ALL ZONES & COMMUNES - ERROR', e);
    }
    if (onInit) {
      this.statisticsService.loadStatistics();
      this.dataService.loadData();
    }
  }

  formatZones(zones: any[], profil?: string, zoneType?: string, commune?: string) {
    let zonesToReturn = zones;
    const communeArreteMunicipal = commune ?
      this.communeArretesMunicipaux?.find(c => c.code === this.communesService.normalizeCodeCommune(commune))?.arretesMunicipaux[0]
      : null;

    if (zoneType) {
      const toReturn = zones.find(z => z.type === zoneType);
      return this.formatZone(toReturn, profil, communeArreteMunicipal);
    }

    const zonesFormated = zonesToReturn?.map(z => this.formatZone(z, profil, communeArreteMunicipal));

    if (communeArreteMunicipal?.fichier?.url) {
      const zonesTypes = ['AEP', 'SOU', 'SUP'];
      zonesTypes.forEach(zoneType => {
        if (zonesFormated.findIndex(z => z.type === zoneType) < 0) {
          zonesFormated.push({
            id: null,
            type: zoneType,
            arreteMunicipalCheminFichier: communeArreteMunicipal.fichier.url,
          });
        }
      });
    }

    return zonesFormated;
  }

  formatZone(zone: any, profil?: string, arreteMunicipal?: ArreteMunicipal) {
    if (!zone) {
      if (arreteMunicipal?.fichier?.url) {
        return {
          id: null,
          arreteMunicipalCheminFichier: arreteMunicipal.fichier.url,
        };
      }
      return zone;
    }

    if (arreteMunicipal?.fichier?.url) {
      zone.arreteMunicipalCheminFichier = arreteMunicipal.fichier.url;
    }

    if (profil) {
      zone.usages = zone.usages.filter(u => {
        if (profil === 'particulier') {
          return u.concerneParticulier;
        } else if (profil === 'entreprise') {
          return u.concerneEntreprise;
        } else if (profil === 'exploitation') {
          return u.concerneExploitation;
        } else if (profil === 'collectivite') {
          return u.concerneCollectivite;
        } else {
          return false;
        }
      });
    }

    // Duplication des attributs pour être ISO SANDRE
    return {
      ...zone, ...{
        gid: zone.idSandre,
        CdZAS: zone.code,
        LbZAS: zone.nom,
        TypeZAS: zone.type,
      },
    };
  }

  async updateArreteMunicipaux() {
    this.communeArretesMunicipaux = await this.communesService.findArretesMunicipaux();
    this.lastUpdateAm = new Date();
  }

  /**
   * Vérification régulière s'il n'y a pas de nouvelles zones
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async updateZones() {
    console.log('CRON', this.loading, this.lastUpdate);
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
  async updateArretesMunicipaux() {
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
