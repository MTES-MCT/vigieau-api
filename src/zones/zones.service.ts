import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import computeBbox from '@turf/bbox';
import { VigieauLogger } from '../logger/vigieau.logger';
import { Commune } from './entities/commune.entity';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { keyBy } from 'lodash';
import { ZoneAlerteComputed } from './entities/zone_alerte_computed.entity';
import { DepartementsService } from '../departements/departements.service';

@Injectable()
export class ZonesService {
  private readonly logger = new VigieauLogger('ZonesService');

  allZonesWithRestrictions: any[] = [];
  zonesFeatures: any = [];
  zonesIndex: any;
  zonesCommunesIndex: any = {};
  allCommunes: Commune[] = [];
  communesFeatures: any = [];
  communesIndex: any;
  zoneTree;
  communeTree;

  constructor(@InjectRepository(ZoneAlerteComputed)
              private readonly zoneAlerteComputedRepository: Repository<ZoneAlerteComputed>,
              @InjectRepository(Commune)
              private readonly communeRepository: Repository<Commune>,
              private readonly departementsService: DepartementsService) {
    this.loadAllZones();
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
      return this.formatZones(zones, profil, zoneType);
    }

    if (commune) {
      const zones = this.searchZonesByCommune(commune);

      if (zones.length === 0) {
        throw new HttpException(
          `Aucune zone d’alerte sur cette commune.`,
          HttpStatus.NOT_FOUND,
        );
      }

      return this.formatZones(zones, profil, zoneType);
    }

    throw new HttpException(
      `Les paramètres lon/lat ou commune sont requis.`,
      HttpStatus.BAD_REQUEST,
    );
  }

  async findOne(id: string) {
    const z = this.allZonesWithRestrictions.find(zone => zone.id === +id);
    if (z) {
      return z;
    }

    throw new HttpException(
      `Aucune zone d’alerte en vigueur ne correspond à cet identifiant.`,
      HttpStatus.NOT_FOUND,
    );
  }

  searchZonesByLonLat({ lon, lat }, allowMultiple = false) {
    const zones = this.zoneTree.search(lon, lat, lon, lat)
      .map(idx => this.zonesFeatures[idx])
      .filter(feature => booleanPointInPolygon([lon, lat], feature))
      .map(feature => this.zonesIndex[feature.properties.idZone]);

    const sup = zones.filter(z => z.type === 'SUP');
    const sou = zones.filter(z => z.type === 'SOU');
    const aep = zones.filter(z => z.type === 'AEP');

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

    const sup = zones.filter(z => z.type === 'SUP');
    const sou = zones.filter(z => z.type === 'SOU');
    const aep = zones.filter(z => z.type === 'AEP');

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

  async loadAllZones() {
    this.logger.log('LOADING ALL ZONES & COMMUNES - BEGIN');
    // @ts-ignore
    const Flatbush = (await import('flatbush')).default;

    const zonesWithRestrictions = await this.zoneAlerteComputedRepository
      .createQueryBuilder('zone_alerte_computed')
      .select('zone_alerte_computed.id', 'id')
      .addSelect('zone_alerte_computed.code', 'code')
      .addSelect('zone_alerte_computed.nom', 'nom')
      .addSelect('zone_alerte_computed.type', 'type')
      .addSelect(
        'ST_AsGeoJSON(ST_TRANSFORM(zone_alerte_computed.geom, 4326))',
        'geom',
      )
      .getRawMany();

    await Promise.all(zonesWithRestrictions.map(async (zone) => {
      const z = await this.zoneAlerteComputedRepository.findOne({
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

    const communes = await this.communeRepository
      .createQueryBuilder('commune')
      .select('commune.id', 'id')
      .addSelect('commune.code', 'code')
      .addSelect('commune.nom', 'nom')
      .addSelect(
        'ST_AsGeoJSON(ST_TRANSFORM(commune.geom, 4326))',
        'geom',
      )
      .where('commune.disabled = false')
      .andWhere('ST_INTERSECTS(commune.geom, (select ST_UNION(z.geom) from zone_alerte_computed as z))')
      .getRawMany();

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
        code: z.code,
        nom: z.nom,
        type: z.type,
        departement: z.restriction?.arreteRestriction?.departement?.code,
        niveauGravite: z.restriction?.niveauGravite,
        arrete: {
          id: z.restriction?.arreteRestriction?.id,
          dateDebutValidite: z.restriction?.arreteRestriction?.dateDebut,
          dateFinValidite: z.restriction?.arreteRestriction?.dateFin,
          cheminFichier: z.restriction?.arreteRestriction?.fichier?.url,
          cheminFichierArreteCadre: z.restriction?.arreteCadre?.fichier?.url,
        },
        usages: usages?.map(u => {
          let description = '';
          switch (z.restriction?.niveauGravite) {
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
    this.allCommunes = communes;


    this.logger.log(`LOADING ALL ZONES & COMMUNES - COMPUTING ${zonesWithRestrictions.length} zones and ${communes.length} communes`);
    this.zoneTree = new Flatbush(this.allZonesWithRestrictions.length);
    for (const zone of this.allZonesWithRestrictions) {
      const geojson = JSON.parse(zonesWithRestrictions.find(z => z.id === zone.id).geom);
      geojson.properties = {
        idZone: zone.id,
        code: zone.code,
        nom: zone.nom,
        type: zone.type,
        niveauGravite: zone.niveauGravite
      };
      const bbox = computeBbox(geojson);
      this.zonesFeatures.push(geojson);
      this.zoneTree.add(...bbox);
    }
    this.zonesIndex = keyBy(this.allZonesWithRestrictions, 'id');
    this.zoneTree.finish();

    this.communeTree = new Flatbush(communes.length);
    for (const commune of communes) {
      const geojson = JSON.parse(commune.geom);
      geojson.properties = {
        idCommune: commune.id,
        code: commune.code,
        nom: commune.nom,
      };
      const bbox = computeBbox(geojson);
      this.communesFeatures.push(geojson);
      this.communeTree.add(...bbox);
    }
    this.communesIndex = keyBy(communes, 'id');
    this.communeTree.finish();

    this.logger.log('LOADING ALL ZONES & COMMUNES - END');
    this.departementsService.computeSituation(this.allZonesWithRestrictions);
  }

  formatZones(zones: any[], profil?: string, zoneType?: string) {
    if (profil) {
      zones.forEach(z => {
        z.usages = z.usages.filter(u => {
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
      });
    }

    if (zoneType) {
      return zones.find(z => z.type === zoneType);
    }

    return zones;
  }
}
