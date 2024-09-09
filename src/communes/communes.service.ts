import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VigieauLogger } from '../logger/vigieau.logger';
import { Commune } from '../zones/entities/commune.entity';
import { keyBy } from 'lodash';

@Injectable()
export class CommunesService {
  private readonly logger = new VigieauLogger('CommunesService');
  communes = [];
  communesIndex = {};

  constructor(@InjectRepository(Commune)
              private readonly communeRepository: Repository<Commune>) {
    this.loadCommunes();
  }

  getCommune(codeCommune) {
    return this.communesIndex[this.normalizeCodeCommune(codeCommune)];
  }

  async loadCommunes() {
    this.logger.log('LOADING COMMUNES - BEGIN');
    this.communesIndex = {};
    this.communes = await this.communeRepository.find({
      where: {
        disabled: false,
      },
    });
    this.communesIndex = keyBy(this.communes, 'code');
    this.logger.log('LOADING COMMUNES - END');
  }

  async findArretesMunicipaux() {
    this.logger.log('LOADING COMMUNES ARRETES MUNICIPAUX');
    return this.communeRepository.find({
      select: {
        code: true,
        arretesMunicipaux: {
          id: true,
          fichier: {
            url: true,
          },
        },
      },
      relations: [
        'arretesMunicipaux',
        'arretesMunicipaux.fichier',
      ],
      where: {
        arretesMunicipaux: {
          statut: 'publie',
        },
      },
    });
  }

  normalizeCodeCommune(codeCommune) {
    if (['75101', '75102', '75103', '75104', '75105', '75106', '75107', '75108', '75109', '75110', '75111', '75112', '75113', '75114', '75115', '75116', '75117', '75118', '75119', '75120'].includes(codeCommune)) {
      return '75056';
    }

    if (['13201', '13202', '13203', '13204', '13205', '13206', '13207', '13208', '13209', '13210', '13211', '13212', '13213', '13214', '13215', '13216'].includes(codeCommune)) {
      return '13055';
    }

    if (['69381', '69382', '69383', '69384', '69385', '69386', '69387', '69388', '69389'].includes(codeCommune)) {
      return '69123';
    }

    return codeCommune;
  }
}
