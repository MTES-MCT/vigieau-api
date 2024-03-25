import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ZoneAlerte } from './entities/zone_alerte.entity';
import { Repository } from 'typeorm';
import computeBbox from '@turf/bbox';
import { VigieauLogger } from '../logger/vigieau.logger';
import { Commune } from './entities/commune.entity';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { keyBy, max } from 'lodash';

@Injectable()
export class ZonesService {
  private readonly logger = new VigieauLogger('ZonesService');

  allZones: ZoneAlerte[] = [];
  zonesFeatures: any = [];
  zonesIndex: any;
  zonesCommunesIndex: any = {};
  allCommunes: Commune[] = [];
  communesFeatures: any = [];
  communesIndex: any;
  zoneTree;
  communeTree;

  constructor(@InjectRepository(ZoneAlerte)
              private readonly zoneAlerteRepository: Repository<ZoneAlerte>,
              @InjectRepository(Commune)
              private readonly communeRepository: Repository<Commune>) {
    this.loadAllZones();
  }

  find(queryLon?: string, queryLat?: string, commune?: string) {
    if (queryLon && queryLat) {
      const lon = Number.parseFloat(queryLon);
      const lat = Number.parseFloat(queryLat);

      if (Number.isNaN(lon) || Number.isNaN(lat) || lon <= -180 || lon >= 180 || lat <= -85 || lat >= 85) {
        throw new HttpException(
          `lon/lat are not valid.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return this.searchZonesByLonLat({ lon, lat });
    }

    if (commune) {
      const zones = this.searchZonesByCommune(commune);

      if (zones.length === 0) {
        throw new HttpException(
          `Aucune zone d’alerte sur cette commune.`,
          HttpStatus.NOT_FOUND,
        );
      }

      return zones;
    }

    throw new HttpException(
      `Les paramètres lon/lat ou commune sont requis.`,
      HttpStatus.BAD_REQUEST,
    );
  }

  async findOne(id: string) {
    const z = this.allZones.find(zone => zone.id === +id);
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
    const communes = this.communeTree.search(lon, lat, lon, lat)
      .map(idx => this.communesFeatures[idx])
      .filter(feature => booleanPointInPolygon([lon, lat], feature))
      .map(feature => this.communesIndex[feature.properties.idCommune]);

    const sup = zones.filter(z => z.type === 'SUP');
    const sou = zones.filter(z => z.type === 'SOU');

    let restrictions = this.formatRestrictions(zones, communes);

    if (sup.length <= 1 && sou.length <= 1 && communes.length <= 1) {
      return restrictions;
    }

    if (!allowMultiple) {
      throw new HttpException(
        `Un problème avec les données ne permet pas de répondre à votre demande.`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return restrictions;
  }

  searchZonesByCommune(commune, allowMultiple = false) {
    const zones = this.zonesCommunesIndex[commune];

    if (!zones) {
      return [];
    }

    const sup = zones.filter(z => z.type === 'SUP');
    const sou = zones.filter(z => z.type === 'SOU');

    if (sup.length <= 1 && sou.length <= 1) {
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

  formatRestrictions(zones, communes) {
    let restrictions = zones.map(
      z => z.restrictions.map(r => {
        r.type = z.type;
        return r;
      }),
    ).flat()
      .concat(communes.map(
        c => c.restrictions.map(r => {
          r.type = 'AEP';
          return r;
        }),
      ).flat());
    // remove empty values
    return restrictions.filter(r => r);
  }

  async loadAllZones() {
    this.logger.log('LOADING ALL ZONES & COMMUNES - BEGIN');
    // @ts-ignore
    const Flatbush = (await import('flatbush')).default;

    const zones = await this.zoneAlerteRepository
      .createQueryBuilder('zone_alerte')
      .select('zone_alerte.id', 'id')
      .addSelect('zone_alerte.code', 'code')
      .addSelect('zone_alerte.nom', 'nom')
      .addSelect('zone_alerte.type', 'type')
      .addSelect(
        'ST_AsGeoJSON(ST_TRANSFORM(zone_alerte.geom, 4326))',
        'geom',
      )
      .where('zone_alerte.disabled = false')
      .getRawMany();

    await Promise.all(zones.map(async (zone) => {
      const z = await this.zoneAlerteRepository.findOne({
        where: {
          id: zone.id,
          restrictions: {
            arreteRestriction: {
              statut: 'publie',
            },
          },
        },
        relations: [
          'restrictions',
          'restrictions.arreteRestriction',
          'restrictions.usages',
        ],
      });
      zone.restrictions = z ? z.restrictions : [];
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
      .getRawMany();

    await Promise.all(communes.map(async (commune) => {
      const c = await this.communeRepository.findOne({
        where: {
          id: commune.id,
          restrictions: {
            arreteRestriction: {
              statut: 'publie',
            },
          },
        },
        relations: [
          'restrictions',
          'restrictions.arreteRestriction',
          'restrictions.usages',
        ],
      });
      commune.restrictions = c ? c.restrictions : [];
      return commune;
    }));

    this.allZones = zones;
    this.allCommunes = communes;


    this.logger.log(`LOADING ALL ZONES & COMMUNES - COMPUTING ${zones.length} zones and ${communes.length} communes`);
    this.zoneTree = new Flatbush(zones.length);
    for (const zone of zones) {
      const geojson = JSON.parse(zone.geom);
      geojson.properties = {
        idZone: zone.id,
        code: zone.code,
        nom: zone.nom,
        type: zone.type,
      };
      const bbox = computeBbox(geojson);
      this.zonesFeatures.push(geojson);
      this.zoneTree.add(...bbox);
    }
    this.zonesIndex = keyBy(zones, 'id');
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
  }
}
