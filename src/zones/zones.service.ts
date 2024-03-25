import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ZoneAlerte } from './entities/zone_alerte.entity';
import { Repository } from 'typeorm';
import computeBbox from '@turf/bbox';
import { VigieauLogger } from '../logger/vigieau.logger';
import { Commune } from './entities/commune.entity';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import {keyBy, max} from 'lodash';

@Injectable()
export class ZonesService {
  private readonly logger = new VigieauLogger('ZonesService');

  allZones: ZoneAlerte[] = [];
  allCommunes: Commune[] = [];
  zonesFeatures: any = [];
  zonesIndex: any;
  zonesCommunesIndex: any = {};
  rtree;

  constructor(@InjectRepository(ZoneAlerte)
              private readonly zoneAlerteRepository: Repository<ZoneAlerte>,
              @InjectRepository(Commune)
              private readonly communeRepository: Repository<Commune>) {
    this.loadAllZones();
  }

  find(queryLon?: string, queryLat?: string, commune?: string) {
    if(queryLon && queryLat) {
      const lon = Number.parseFloat(queryLon)
      const lat = Number.parseFloat(queryLat)

      if (Number.isNaN(lon) || Number.isNaN(lat) || lon <= -180 || lon >= 180 || lat <= -85 || lat >= 85) {
        throw new HttpException(
          `lon/lat are not valid.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const zones = this.searchZonesByLonLat({lon, lat})
      return zones;
    }

    if(commune) {
      const zones = this.searchZonesByCommune(commune)

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
    if(z) {
      return z;
    }

    throw new HttpException(
      `Aucune zone d’alerte en vigueur ne correspond à cet identifiant.`,
      HttpStatus.NOT_FOUND,
    );
  }

  searchZonesByLonLat({lon, lat}, allowMultiple = false) {
    const zones = this.rtree.search(lon, lat, lon, lat)
      .map(idx => this.zonesFeatures[idx])
      .filter(feature => booleanPointInPolygon([lon, lat], feature))
      .map(feature => this.zonesIndex[feature.properties.idZone])

    const sup = zones.filter(z => z.type === 'SUP')
    const sou = zones.filter(z => z.type === 'SOU')

    if (sup.length <= 1 && sou.length <= 1) {
      return zones
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
    const zones = this.zonesCommunesIndex[commune]

    if (!zones) {
      return []
    }

    const sup = zones.filter(z => z.type === 'SUP')
    const sou = zones.filter(z => z.type === 'SOU')

    if (sup.length <= 1 && sou.length <= 1) {
      return zones
    }

    if (!allowMultiple) {
      throw new HttpException(
        `La commune comporte plusieurs zones d’alerte de même type.`,
        HttpStatus.CONFLICT,
      );
    }

    return zones
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
      .leftJoinAndSelect('zone_alerte.restrictions', 'restriction')
      .leftJoinAndSelect('restriction.arreteRestriction', 'arrete_restriction')
      .where('zone_alerte.disabled = false')
      .andWhere('arrete_restriction.statut = \'publie\'')
      .getRawMany();

    // const communes = await this.communeRepository
    //   .createQueryBuilder('commune')
    //   .select('commune.id', 'id')
    //   .addSelect('commune.code', 'code')
    //   .addSelect('commune.nom', 'nom')
    //   .addSelect(
    //     'ST_AsGeoJSON(ST_TRANSFORM(commune.geom, 4326))',
    //     'geom',
    //   )
    //   .where('commune.disabled = false')
    //   .getRawMany();

    this.allZones = zones;
    // this.allCommunes = communes;


    this.logger.log(`LOADING ALL ZONES & COMMUNES - COMPUTING ${zones.length} zones`);
    this.rtree = new Flatbush(zones.length);
    for (const zone of zones) {
      const geojson = JSON.parse(zone.geom);
      geojson.properties = {
        idZone: zone.id,
        code: zone.code,
        nom: zone.nom,
        type: zone.type,
      }
      const bbox = computeBbox(geojson);
      this.zonesFeatures.push(geojson);
      this.rtree.add(...bbox);

      // for (const commune of zone.communes) {
      //   if (!this.zonesCommunesIndex[commune]) {
      //     this.zonesCommunesIndex[commune] = []
      //   }
      //
      //   this.zonesCommunesIndex[commune].push(zone)
      // }
    }
    this.zonesIndex = keyBy(zones, 'id')

    // for (const commune of communes) {
    //   const bbox = computeBbox(JSON.parse(commune.geom));
    //   this.rtree.add(...bbox)
    // }
    this.rtree.finish()

    this.logger.log('LOADING ALL ZONES & COMMUNES - END');
  }
}
