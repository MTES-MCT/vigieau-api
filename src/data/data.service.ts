import { Injectable } from '@nestjs/common';
import { VigieauLogger } from '../logger/vigieau.logger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StatisticDepartement } from './entities/statistic_departement.entity';
import { Departement } from '../zones/entities/departement.entity';
import moment from 'moment';

@Injectable()
export class DataService {
  private readonly logger = new VigieauLogger('DataService');

  data: any;
  departements: any[];
  metropoleArea: number;
  fullArea: number;
  releaseDate = '2023-07-11';
  beginDate = '2013-01-01';

  constructor(@InjectRepository(StatisticDepartement)
              private readonly statisticDepartementRepository: Repository<StatisticDepartement>,
              @InjectRepository(Departement)
              private readonly departementRepository: Repository<Departement>,
  ) {
    this.loadData();
  }

  findByDate(dateDebut?: string, dateFin?: string) {
    const dataFiltered = this.data.filter(d =>
      moment(d.date).isSameOrAfter(moment(this.beginDate, 'YYYY-MM-DD'), 'day')
      && moment(d.date, 'YYYY-MM-DD').isSameOrBefore(moment(), 'day')
      && (dateDebut ? moment(d.date, 'YYYY-MM-DD').isSameOrAfter(moment(dateDebut, 'YYYY-MM-DD'), 'day') : true)
      && (dateFin ? moment(d.date, 'YYYY-MM-DD').isSameOrBefore(moment(dateFin, 'YYYY-MM-DD'), 'day') : true),
    );
    return dataFiltered.map(d => {
      return {
        date: d.date,
        ESO: this.filterRestrictions(d.restrictions, 'SOU', this.fullArea),
        ESU: this.filterRestrictions(d.restrictions, 'SUP', this.fullArea),
        AEP: this.filterRestrictions(d.restrictions, 'AEP', this.fullArea),
      };
    });
  }

  filterRestrictions(restrictions: any, zoneType: string, areaPercentage: number) {
    return {
      vigilance: (restrictions.reduce((acc, r) => acc + Number(r[zoneType] ? r[zoneType].vigilance : 0), 0) * 100 / areaPercentage).toFixed(2),
      alerte: (restrictions.reduce((acc, r) => acc + Number(r[zoneType] ? r[zoneType].alerte : 0), 0) * 100 / areaPercentage).toFixed(2),
      alerte_renforcee: (restrictions.reduce((acc, r) => acc + Number(r[zoneType] ? r[zoneType].alerte_renforcee : 0), 0) * 100 / areaPercentage).toFixed(2),
      crise: (restrictions.reduce((acc, r) => acc + Number(r[zoneType] ? r[zoneType].crise : 0), 0) * 100 / areaPercentage).toFixed(2),
    };
  }

  async loadData() {
    this.logger.log('LOAD DATA');
    const statisticsDepartement = await this.statisticDepartementRepository.find({
      relations: ['departement'],
    });
    this.departements = await this.departementRepository
      .createQueryBuilder('departement')
      .select('departement.id', 'id')
      .addSelect('departement.code', 'code')
      .addSelect('departement.nom', 'nom')
      .addSelect(
        'ST_Area(departement.geom::geography)/1000000',
        'area')
      .getRawMany();
    this.fullArea = this.departements.reduce((acc, d) => acc + d.area, 0);
    this.metropoleArea = this.departements.filter(d => d.code.length < 3).reduce((acc, d) => acc + d.area, 0);

    const endDate = moment();
    this.data = [];
    for (let m = moment(this.beginDate, 'YYYY-MM-DD'); m.diff(endDate, 'days', true) <= 0; m.add(1, 'days')) {
      const d = {
        date: m.format('YYYY-MM-DD'),
        restrictions: [],
      };
      statisticsDepartement.forEach((statisticDepartement) => {
        const restriction = statisticDepartement.restrictions.find(r => r.date === m.format('YYYY-MM-DD'));
        if (restriction) {
          d.restrictions.push({
            ...{ departement: statisticDepartement.departement.code },
            ...restriction,
          });
        }
      });
      this.data.push(d);
    }
  }
}