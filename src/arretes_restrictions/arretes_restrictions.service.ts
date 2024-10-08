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

  async getByDate(date?: string, bassinVersant?: string, region?: string, departement?: string) {
    const whereClause: any = {
      statut: In(['publie', 'abroge']),
      dateDebut: LessThanOrEqual(date),
    };
    if (bassinVersant) {
      whereClause.departement = {
        bassinsVersants: {
          id: bassinVersant,
        },
      };
    }
    if (region) {
      whereClause.departement = {
        region: {
          id: region,
        },
      };
    }
    if (departement) {
      whereClause.departement = {
        id: departement,
      };
    }
    const ars: any[] = await this.arreteRestrictionRepository.find({
      select: {
        id: true,
        numero: true,
        dateDebut: true,
        dateFin: true,
        dateSignature: true,
        statut: true,
        departement: {
          code: true,
          nom: true,
        },
        fichier: {
          nom: true,
          url: true,
          size: true,
        },
        arretesCadre: {
          id: true,
          numero: true,
          dateDebut: true,
          dateFin: true,
          fichier: {
            url: true,
          },
        },
        restrictions: {
          niveauGravite: true,
          zonesAlerteComputed: {
            type: true,
          },
        },
      },
      relations: [
        'departement',
        'fichier',
        'restrictions',
        'restrictions.zonesAlerteComputed',
        'arretesCadre',
        'arretesCadre.fichier',
      ],
      where: [
        {
          ...whereClause,
          dateFin: MoreThanOrEqual(date),
        },
        {
          ...whereClause,
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
      ar.niveauGraviteMax = null;
      ar.restrictions?.forEach(r => {
        if (!ar.niveauGraviteMax || niveauGravitePriority[r.niveauGravite] > niveauGravitePriority[ar.niveauGraviteMax]) {
          ar.niveauGraviteMax = r.niveauGravite;
        }
      });
      ar.types = ar.restrictions.map(r => r.zonesAlerteComputed.map(z => z.type)).flat();
      ar.types = [...new Set(ar.types)].sort();
      return ar;
    });
  }
}