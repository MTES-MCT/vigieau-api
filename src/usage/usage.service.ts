import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { Usage } from '../zones/entities/usage.entity';
import { UsageFeedback } from './entities/usage_feedback.entity';

@Injectable()
export class UsageService {
  constructor(@InjectRepository(Usage)
              private readonly usageRepository: Repository<Usage>,
              @InjectRepository(UsageFeedback)
              private readonly usageFeedbackRepository: Repository<UsageFeedback>) {
  }

  /**
   * Enregistre un feedback pour un usage donné.
   * @param usageId Identifiant de l'usage.
   * @param feedback Commentaire de l'utilisateur.
   * @returns Le feedback enregistré.
   * @throws HttpException Si l'usage n'est pas trouvé.
   */
  async feedback(usageId: number, feedback?: string): Promise<UsageFeedback> {
    const usage = await this.usageRepository.findOne(<FindOneOptions>{
      select: {
        id: true,
        nom: true,
        thematique: { id: true, nom: true },
        descriptionVigilance: true,
        descriptionAlerte: true,
        descriptionAlerteRenforcee: true,
        descriptionCrise: true,
        restriction: { niveauGravite: true, arreteRestriction: { id: true } },
      },
      relations: ['thematique', 'restriction', 'restriction.arreteRestriction'],
      where: { id: usageId },
    });

    if (!usage) {
      throw new HttpException(
        `Usage non trouvé.`,
        HttpStatus.NOT_FOUND,
      );
    }

    const descriptionMap = {
      vigilance: usage.descriptionVigilance,
      alerte: usage.descriptionAlerte,
      alerte_renforcee: usage.descriptionAlerteRenforcee,
      crise: usage.descriptionCrise,
    };
    const description = descriptionMap[usage.restriction.niveauGravite] || null;

    const usageFeedback = {
      usageNom: usage.nom,
      usageThematique: usage.thematique.nom,
      usageDescription: description,
      arreteRestriction: {
        id: usage.restriction.arreteRestriction.id,
      },
      feedback: feedback,
    };
    return this.usageFeedbackRepository.save(usageFeedback);
  }
}
