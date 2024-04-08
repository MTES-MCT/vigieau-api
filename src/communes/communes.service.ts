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
    return this.communesIndex[codeCommune];
  }

  async loadCommunes() {
    this.communesIndex = {};
    this.communes = await this.communeRepository.find({
      where: {
        disabled: false,
      }
    });
    this.communesIndex = keyBy(this.communes, 'code')
  }
}
