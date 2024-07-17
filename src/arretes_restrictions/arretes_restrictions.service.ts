import { Injectable } from '@nestjs/common';
import { VigieauLogger } from '../logger/vigieau.logger';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { ArreteRestriction } from '../zones/entities/arrete_restriction.entity';

@Injectable()
export class ArretesRestrictionsService {
  private readonly logger = new VigieauLogger('ArretesRestrictionsService');

  constructor(@InjectRepository(ArreteRestriction)
              private readonly arreteRestrictionRepository: Repository<ArreteRestriction>) {
  }

  async getByDate(date?: string) {
    const ars: any[] = await this.arreteRestrictionRepository.find({
      select: {
        id: true,
        numero: true,
        dateDebut: true,
        dateFin: true,
        dateSignature: true,
        departement: {
          code: true,
          nom: true,
        },
        fichier: {
          nom: true,
          url: true,
          size: true,
        },
        restrictions: {
          niveauGravite: true,
          zonesAlerteComputed: {
            type: true,
          },
        },
      },
      relations: ['departement', 'fichier', 'restrictions', 'restrictions.zonesAlerteComputed'],
      where: [
        {
          statut: In(['publie', 'abroge']),
          dateDebut: LessThanOrEqual(date),
          dateFin: MoreThanOrEqual(date),
        },
        {
          statut: In(['publie', 'abroge']),
          dateDebut: LessThanOrEqual(date),
          dateFin: IsNull(),
        },
      ],
      order: {
        dateDebut: 'DESC',
      },
    });

    const niveauGravitePriority = {
      'vigilance': 1,
      'alerte': 2,
      'alerte_renforcee': 3,
      'crise': 4,
    };
    return ars.map(ar => {
      ar.niveauGraviteMax = ar.restrictions.length > 0 ? ar.restrictions.reduce((acc, restriction) => {
        if (niveauGravitePriority[restriction.status] > niveauGravitePriority[acc.status]) {
          return restriction;
        }
        return acc;
      }).niveauGravite : null;
      ar.types = ar.restrictions.map(r => r.zonesAlerteComputed.map(z => z.type)).flat();
      ar.types = [...new Set(ar.types)].sort();
      return ar;
    });
  }
}