import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Departement } from '../zones/entities/departement.entity';
import { VigieauLogger } from '../logger/vigieau.logger';
import { DepartementDto } from './dto/departement.dto';
import { Statistic } from '../statistics/entities/statistic.entity';
import { Utils } from '../core/utils';
import { max } from 'lodash';

@Injectable()
export class DepartementsService {
  private readonly logger = new VigieauLogger('DepartementsService');
  situationDepartements: any[] = [];

  constructor(@InjectRepository(Departement)
              private readonly departementRepository: Repository<Departement>,
              @InjectRepository(Statistic)
              private readonly statisticRepository: Repository<Statistic>) {
  }

  getAllLight() {
    return this.departementRepository.find({
      select: {
        id: true,
        code: true,
        region: {
          id: true,
          code: true,
        },
      },
      relations: ['region'],
    });
  }

  situationByDepartement(date?: string): DepartementDto[] {
    if(!date) {
      date = new Date().toISOString().split('T')[0];
    }
    const situationDepartement = this.situationDepartements.find(s => s.date === date);
    if(!situationDepartement) {
      throw new HttpException(
        `Date non disponible.`,
        HttpStatus.NOT_FOUND,
      );
    }
    return situationDepartement.departementSituation;
  }

  async loadSituation(currentZones) {
    this.logger.log('LOAD SITUATION DEPARTEMENTS - BEGIN');
    const departements = await this.departementRepository.find({
      select: {
        id: true,
        code: true,
        nom: true,
        region: {
          nom: true,
        },
      },
      relations: ['region'],
      order: {
        code: 'ASC',
      },
    });
    const statistics = await this.statisticRepository.find({
      select: {
        date: true,
        departementSituation: true,
      },
      order: {
        date: 'ASC',
      },
    });
    this.situationDepartements = statistics.map(s => {
      return {
        date: s.date,
        departementSituation: departements.map(d => {
          let niveauGraviteMax = s.departementSituation && s.departementSituation[d.code] ? s.departementSituation[d.code] : null;
          if(s.date === new Date().toISOString().split('T')[0]) {
            const depZones = currentZones.filter(z => z.departement === d.code);
            niveauGraviteMax = depZones.length > 0 ? Utils.getNiveauInversed(max(depZones.map(z => Utils.getNiveau(z.niveauGravite)))) : null;
          }
          return {
            code: d.code,
            nom: d.nom,
            region: d.region?.nom,
            niveauGraviteMax: niveauGraviteMax,
          }
        }),
      };
    });
    this.logger.log('LOAD SITUATION DEPARTEMENTS - END');
  }
}
