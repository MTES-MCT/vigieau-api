import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { VigieauLogger } from '../logger/vigieau.logger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatisticDepartement } from './entities/statistic_departement.entity';
import { Departement } from '../zones/entities/departement.entity';
import moment from 'moment';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Region } from '../zones/entities/region.entity';
import { BassinVersant } from '../zones/entities/bassin_versant.entity';
import { StatisticCommune } from './entities/statistic_commune.entity';
import { Commune } from '../zones/entities/commune.entity';

@Injectable()
export class DataService {
  private readonly logger = new VigieauLogger('DataService');

  data: any;
  dataArea: any;
  dataDepartement: any;
  dataCommune: any;
  communes: any[];
  departements: any[];
  regions: Region[];
  bassinsVersants: BassinVersant[];
  metropoleArea: number;
  fullArea: number;
  releaseDate = '2023-07-11';
  beginDate = '2013-01-01';

  constructor(@InjectRepository(StatisticDepartement)
              private readonly statisticDepartementRepository: Repository<StatisticDepartement>,
              @InjectRepository(StatisticCommune)
              private readonly statisticCommuneRepository: Repository<StatisticCommune>,
              @InjectRepository(Commune)
              private readonly communeRepository: Repository<Commune>,
              @InjectRepository(Departement)
              private readonly departementRepository: Repository<Departement>,
              @InjectRepository(Region)
              private readonly regionRepository: Repository<Region>,
              @InjectRepository(BassinVersant)
              private readonly bassinVersantRepository: Repository<BassinVersant>,
  ) {
  }

  areaFindByDate(dateDebut?: string, dateFin?: string, bassinVersant?: string, region?: string, departement?: string) {
    let dataAreaFiltered = this.dataArea.filter(d =>
      moment(d.date).isSameOrAfter(moment(this.beginDate, 'YYYY-MM-DD'), 'day')
      && moment(d.date, 'YYYY-MM-DD').isSameOrBefore(moment(), 'day')
      && (dateDebut ? moment(d.date, 'YYYY-MM-DD').isSameOrAfter(moment(dateDebut, 'YYYY-MM-DD'), 'day') : true)
      && (dateFin ? moment(d.date, 'YYYY-MM-DD').isSameOrBefore(moment(dateFin, 'YYYY-MM-DD'), 'day') : true),
    );
    if (bassinVersant) {
      const b = this.bassinsVersants.find(b => b.id === +bassinVersant);
      if (!b) {
        throw new HttpException(
          `Bassin versant non trouvé.`,
          HttpStatus.NOT_FOUND,
        );
      }
      return dataAreaFiltered.map(d => {
        return {
          date: d.date,
          ESO: d.bassinsVersants.find(bv => bv.id === b.id).ESO,
          ESU: d.bassinsVersants.find(bv => bv.id === b.id).ESU,
          AEP: d.bassinsVersants.find(bv => bv.id === b.id).AEP,
        };
      });
    }
    if (region) {
      const r = this.regions.find(r => r.id === +region);
      if (!r) {
        throw new HttpException(
          `Région non trouvée.`,
          HttpStatus.NOT_FOUND,
        );
      }
      return dataAreaFiltered.map(d => {
        return {
          date: d.date,
          ESO: d.regions.find(re => re.id === r.id).ESO,
          ESU: d.regions.find(re => re.id === r.id).ESU,
          AEP: d.regions.find(re => re.id === r.id).AEP,
        };
      });
    }
    if (departement) {
      const d = this.departements.find(d => d.id === +departement);
      if (!d) {
        throw new HttpException(
          `Département non trouvé.`,
          HttpStatus.NOT_FOUND,
        );
      }
      return dataAreaFiltered.map(data => {
        return {
          date: data.date,
          ESO: data.departements.find(dep => dep.id === d.id).ESO,
          ESU: data.departements.find(dep => dep.id === d.id).ESU,
          AEP: data.departements.find(dep => dep.id === d.id).AEP,
        };
      });
    }
    return dataAreaFiltered.map(d => {
      return {
        date: d.date,
        ESO: d.ESO,
        ESU: d.ESU,
        AEP: d.AEP,
      };
    });
  }

  departementFindByDate(dateDebut?: string, dateFin?: string, bassinVersant?: string, region?: string, departement?: string) {
    let dataDepartementFiltered = this.dataDepartement.filter(d =>
      moment(d.date).isSameOrAfter(moment(this.beginDate, 'YYYY-MM-DD'), 'day')
      && moment(d.date, 'YYYY-MM-DD').isSameOrBefore(moment(), 'day')
      && (dateDebut ? moment(d.date, 'YYYY-MM-DD').isSameOrAfter(moment(dateDebut, 'YYYY-MM-DD'), 'day') : true)
      && (dateFin ? moment(d.date, 'YYYY-MM-DD').isSameOrBefore(moment(dateFin, 'YYYY-MM-DD'), 'day') : true),
    );
    let departementsToFilter = [];
    if (bassinVersant) {
      const b = this.bassinsVersants.find(b => b.id === +bassinVersant);
      if (!b) {
        throw new HttpException(
          `Bassin versant non trouvé.`,
          HttpStatus.NOT_FOUND,
        );
      }
      departementsToFilter = b.departements;
    }
    if (region) {
      const r = this.regions.find(r => r.id === +region);
      if (!r) {
        throw new HttpException(
          `Région non trouvée.`,
          HttpStatus.NOT_FOUND,
        );
      }
      departementsToFilter = r.departements;
    }
    if (departement) {
      const d = this.departements.find(d => d.id === +departement);
      if (!d) {
        throw new HttpException(
          `Département non trouvé.`,
          HttpStatus.NOT_FOUND,
        );
      }
      departementsToFilter = [d];
    }
    if (departementsToFilter && departementsToFilter.length > 0) {
      dataDepartementFiltered = dataDepartementFiltered.map(d => {
        d.departements = d.departements.filter(dep => departementsToFilter.some(depf => depf.code === dep.code));
        return d;
      });
    }
    return dataDepartementFiltered;
  }

  duree() {
    return this.dataCommune;
  }

  commune(code: string) {
    return this.statisticCommuneRepository.findOne({
      select: {
        id: true,
        restrictions: true,
        commune: {
          id: true,
          code: true,
          nom: true,
        }
      },
      relations: ['commune'],
      where: {
        commune: {
          code: code
        }
      }
    });
  }

  @Cron(CronExpression.EVERY_3_HOURS)
  async loadData() {
    this.logger.log('LOAD DATA');
    await this.loadRefData();
    this.logMemoryUsage();

    this.data = [];
    const endDate = moment();
    for (let m = moment(this.beginDate, 'YYYY-MM-DD'); m.diff(endDate, 'days', true) <= 0; m.add(1, 'days')) {
      const d = {
        date: m.format('YYYY-MM-DD'),
        departements: [],
        communes: [],
      };
      this.data.push(d);
    }

    await this.loadDepartementData();
    this.data = [];

    await this.loadCommuneData();
  }

  async loadRefData() {
    this.communes = await this.communeRepository.find({
      select: {
        id: true,
        code: true,
        nom: true,
      },
      order: {
        code: 'ASC',
      },
    });
    this.departements = (await this.departementRepository
      .createQueryBuilder('departement')
      .select('departement.id', 'id')
      .addSelect('departement.code', 'code')
      .addSelect('departement.nom', 'nom')
      .addSelect(
        'ST_Area(departement.geom::geography)/1000000',
        'area')
      .addSelect('ST_Extent(departement.geom)', 'bounds')
      .groupBy('id')
      .orderBy('nom', 'ASC')
      .getRawMany()).map(d => {
      const bounds = {
        minLat: d.bounds.split('(')[1].split(' ')[0],
        maxLat: d.bounds.split(',')[1].split(' ')[0],
        minLong: d.bounds.split(' ')[1].split(',')[0],
        maxLong: d.bounds.split(' ')[2].split(')')[0],
      };
      d.bounds = bounds;
      return d;
    });
    this.regions = await this.regionRepository.find({
      relations: ['departements'],
      order: {
        nom: 'ASC',
      },
    });
    this.bassinsVersants = await this.bassinVersantRepository.find({
      relations: ['departements'],
      order: {
        nom: 'ASC',
      },
    });
    this.fullArea = this.departements.reduce((acc, d) => acc + d.area, 0);
    this.metropoleArea = this.departements.filter(d => d.code.length < 3).reduce((acc, d) => acc + d.area, 0);
  }

  async loadDepartementData() {
    let statisticsDepartement = await this.statisticDepartementRepository.find({
      relations: ['departement'],
    });

    for (const statisticDepartement of statisticsDepartement) {
      for (const restriction of statisticDepartement.restrictions) {
        const d = this.data.find(x => x.date === restriction.date);
        d.departements.push({
          ...{ departement: statisticDepartement.departement.code },
          ...restriction,
        });
      }
    }

    this.computeDataArea();
    this.logMemoryUsage();

    this.computeDataDepartement();
    this.logMemoryUsage();

    for (const d of this.data) {
      d.departements = [];
    }
  }

  async loadCommuneData() {
    this.logger.log('COMPUTE DATA COMMUNE - BEGIN');
    this.dataCommune = [];
    const communesCount = await this.statisticCommuneRepository.count();
    for (let i = 0; i < communesCount; i = i + 1000) {
      for (const d of this.data) {
        d.communes = [];
      }
      let statisticsCommune = await this.statisticCommuneRepository.find({
        select: {
          id: true,
          restrictionsByMonth: true,
          commune: {
            id: true,
            code: true,
          },
        },
        relations: ['commune'],
        take: 1000,
        skip: i,
      });

      this.computeDataCommune(statisticsCommune);
    }
    this.logger.log('COMPUTE DATA COMMUNE - END');
    this.logMemoryUsage();
  }

  computeDataArea() {
    this.logger.log('COMPUTE DATA AREA');
    this.dataArea = [];
    for (const data of this.data) {
      this.dataArea.push({
        date: data.date,
        ESO: this.filterRestrictions(data.departements, 'SOU', this.fullArea),
        ESU: this.filterRestrictions(data.departements, 'SUP', this.fullArea),
        AEP: this.filterRestrictions(data.departements, 'AEP', this.fullArea),
        bassinsVersants: this.bassinsVersants.map(b => {
          const depFiltered = this.departements.filter(d => b.departements.some(dep => dep.id === d.id));
          const area = depFiltered.reduce((acc, d) => acc + d.area, 0);
          const restrictions = data.departements.filter(r => depFiltered.some(dep => dep.code === r.departement));
          return {
            id: b.id,
            ESO: this.filterRestrictions(restrictions, 'SOU', area),
            ESU: this.filterRestrictions(restrictions, 'SUP', area),
            AEP: this.filterRestrictions(restrictions, 'AEP', area),
          };
        }),
        regions: this.regions.map(r => {
          const depFiltered = this.departements.filter(d => r.departements.some(dep => dep.id === d.id));
          const area = depFiltered.reduce((acc, d) => acc + d.area, 0);
          const restrictions = data.departements.filter(r => depFiltered.some(dep => dep.code === r.departement));
          return {
            id: r.id,
            ESO: this.filterRestrictions(restrictions, 'SOU', area),
            ESU: this.filterRestrictions(restrictions, 'SUP', area),
            AEP: this.filterRestrictions(restrictions, 'AEP', area),
          };
        }),
        departements: this.departements.map(dep => {
          const area = dep.area;
          const restrictions = data.departements.filter(r => dep.code === r.departement);
          return {
            id: dep.id,
            ESO: this.filterRestrictions(restrictions, 'SOU', area),
            ESU: this.filterRestrictions(restrictions, 'SUP', area),
            AEP: this.filterRestrictions(restrictions, 'AEP', area),
          };
        }),
      });
    }
  }

  filterRestrictions(restrictions: any, zoneType: string, areaPercentage: number) {
    return {
      vigilance: (restrictions.reduce((acc, r) => acc + Number(r[zoneType] ? r[zoneType].vigilance : 0), 0) * 100 / areaPercentage).toFixed(2),
      alerte: (restrictions.reduce((acc, r) => acc + Number(r[zoneType] ? r[zoneType].alerte : 0), 0) * 100 / areaPercentage).toFixed(2),
      alerte_renforcee: (restrictions.reduce((acc, r) => acc + Number(r[zoneType] ? r[zoneType].alerte_renforcee : 0), 0) * 100 / areaPercentage).toFixed(2),
      crise: (restrictions.reduce((acc, r) => acc + Number(r[zoneType] ? r[zoneType].crise : 0), 0) * 100 / areaPercentage).toFixed(2),
    };
  }

  computeDataDepartement() {
    this.logger.log('COMPUTE DATA DEPARTEMENT');
    this.dataDepartement = [];
    for (const d of this.data) {
      const tmp = {
        date: d.date,
        departements: [],
      };
      this.departements.forEach(departement => {
        tmp.departements.push({
          code: departement.code,
          niveauGravite: this.findMaxNiveauGravite(d.departements, departement.code),
        });
      });
      this.dataDepartement.push(tmp);
    }
  }

  computeDataCommune(statisticsCommune) {
    const communesFiltered = this.communes.filter(c => statisticsCommune.some(sc => sc.commune.code === c.code));
    this.logger.log('COMMUNES FILTERED', communesFiltered.length);
    for (const sc of statisticsCommune) {
      this.dataCommune.push({
        code: sc.commune.code,
        restrictions: sc.restrictionsByMonth.map(r => {
          return {
            d: r.date,
            p: r.ponderation,
          }
        })
      })
    }
  }

  findMaxNiveauGravite(restrictions: any[], departementCode: string) {
    const restrictionsDepartement = restrictions.find(r => r.departement === departementCode);
    if (!restrictionsDepartement) {
      return null;
    }
    const zonesType = ['SUP', 'SOU', 'AEP'];
    const niveauxGravite = ['crise', 'alerte_renforcee', 'alerte', 'vigilance'];
    for (const niveauGravite of niveauxGravite) {
      for (const zoneType of zonesType) {
        if (restrictionsDepartement[zoneType][niveauGravite] > 0) {
          return niveauGravite;
        }
      }
    }
    return null;
  }

  getRefData() {
    return {
      bassinsVersants: this.bassinsVersants.filter(b => b.departements && b.departements.length > 0).map(b => {
        return {
          id: b.id,
          code: b.code,
          nom: b.nom,
          departements: b.departements.map(d => {
            return {
              id: d.id,
              code: d.code,
            };
          }),
        };
      }),
      regions: this.regions.filter(r => r.departements && r.departements.length > 0).map(r => {
        return {
          id: r.id,
          code: r.code,
          nom: r.nom,
          departements: r.departements.map(d => {
            return {
              id: d.id,
              code: d.code,
            };
          }),
        };
      }),
      departements: this.departements.map(d => {
        return {
          id: d.id,
          code: d.code,
          nom: d.nom,
          bounds: d.bounds,
        };
      }),
    };
  }

  // TMP
  formatMemoryUsage(data) {
    return `${Math.round(data / 1024 / 1024 * 100) / 100} MB`;
  }

  logMemoryUsage() {
    const memoryData = process.memoryUsage();

    const memoryUsage = {
      rss: `${this.formatMemoryUsage(memoryData.rss)} -> Resident Set Size - total memory allocated for the process execution`,
      heapTotal: `${this.formatMemoryUsage(memoryData.heapTotal)} -> total size of the allocated heap`,
      heapUsed: `${this.formatMemoryUsage(memoryData.heapUsed)} -> actual memory used during the execution`,
      external: `${this.formatMemoryUsage(memoryData.external)} -> V8 external memory`,
    };

    this.logger.log(memoryUsage);
  }
}