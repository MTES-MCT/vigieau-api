import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { VigieauLogger } from '../logger/vigieau.logger';
import { Commune } from '../zones/entities/commune.entity';
import { keyBy } from 'lodash';

@Injectable()
export class CommunesService {
  private readonly logger = new VigieauLogger('CommunesService');

  private communes: Commune[] = []; // Liste des communes chargées
  private communesIndex: Record<string, Commune> = {}; // Index des communes par code

  constructor(@InjectRepository(Commune)
              private readonly communeRepository: Repository<Commune>) {
    this.loadCommunes();
  }

  /**
   * Récupère une commune par son code.
   * Si le code est un arrondissement (Paris, Marseille, Lyon), il est normalisé vers le code principal.
   *
   * @param codeCommune Le code de la commune à rechercher.
   * @returns La commune correspondante ou undefined si elle n'existe pas.
   */
  getCommune(codeCommune: string): Commune | undefined {
    return this.communesIndex[this.normalizeCodeCommune(codeCommune)];
  }

  /**
   * Charge toutes les communes actives depuis la base de données.
   * Les communes sont indexées par leur code pour des recherches rapides.
   */
  async loadCommunes(): Promise<void> {
    this.logger.log('LOADING COMMUNES - BEGIN');
    this.resetCommunes();
    this.communes = await this.communeRepository.find({
      where: {
        disabled: false,
      },
    });
    this.communesIndex = keyBy(this.communes, 'code');
    this.logger.log(`LOADING COMMUNES - SUCCESS: ${this.communes?.length} communes chargées.`);
  }

  /**
   * Recherche toutes les communes ayant des arrêtés municipaux publiés.
   *
   * @returns Une liste de communes avec leurs arrêtés municipaux publiés.
   */
  async findArretesMunicipaux() {
    this.logger.log('LOADING COMMUNES ARRETES MUNICIPAUX');
    return this.communeRepository.find(<FindOneOptions<Commune>>{
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

  /**
   * Normalise un code commune.
   * Les codes des arrondissements de Paris, Marseille et Lyon sont convertis en leur code principal.
   *
   * @param codeCommune Le code de la commune à normaliser.
   * @returns Le code normalisé.
   */
  normalizeCodeCommune(codeCommune: string): string {
    // Paris
    if (['75101', '75102', '75103', '75104', '75105', '75106', '75107', '75108', '75109', '75110', '75111', '75112', '75113', '75114', '75115', '75116', '75117', '75118', '75119', '75120'].includes(codeCommune)) {
      return '75056';
    }

    // Marseille
    if (['13201', '13202', '13203', '13204', '13205', '13206', '13207', '13208', '13209', '13210', '13211', '13212', '13213', '13214', '13215', '13216'].includes(codeCommune)) {
      return '13055';
    }

    // Lyon
    if (['69381', '69382', '69383', '69384', '69385', '69386', '69387', '69388', '69389'].includes(codeCommune)) {
      return '69123';
    }

    return codeCommune;
  }

  /**
   * Réinitialise les données des communes en mémoire.
   */
  private resetCommunes(): void {
    this.communes = [];
    this.communesIndex = {};
  }
}
