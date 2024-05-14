import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Departement } from '../zones/entities/departement.entity';
import { max } from 'lodash';
import { Utils } from '../core/utils';
import { VigieauLogger } from '../logger/vigieau.logger';
import { DepartementDto } from './dto/departement.dto';

@Injectable()
export class DepartementsService {
  private readonly logger = new VigieauLogger('DepartementsService');
  situationDepartements: DepartementDto[] = [];

  constructor(@InjectRepository(Departement)
              private readonly departementRepository: Repository<Departement>) {
  }

  getAllLight() {
    return this.departementRepository.find({
      select: {
        id: true,
        code: true,
        region: {
          id: true,
          code: true,
        }
      },
      relations: ['region']
    })
  }

  situationByDepartement(): DepartementDto[] {
    return this.situationDepartements;
  }

  async computeSituation(zones) {
    this.logger.log('COMPUTE SITUATION DEPARTEMENTS - BEGIN');
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
    this.situationDepartements = departements.map(d => {
      const depZones = zones.filter(z => z.departement === d.code)
      return {
        code: d.code,
        nom: d.nom,
        region: d.region?.nom,
        niveauGraviteMax: depZones.length > 0 ? Utils.getNiveauInversed(max(depZones.map(z => Utils.getNiveau(z.niveauGravite)))) : null
      }
    });
    this.logger.log('COMPUTE SITUATION DEPARTEMENTS - END');
  }
}
