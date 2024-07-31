import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usage } from '../zones/entities/usage.entity';
import { UsageFeedback } from './entities/usage_feedback.entity';

@Injectable()
export class UsageService {
  constructor(@InjectRepository(Usage)
              private readonly usageRepository: Repository<Usage>,
              @InjectRepository(UsageFeedback)
              private readonly usageFeedbackRepository: Repository<UsageFeedback>) {
  }

  async feedback(usageId: number, feedback: string) {
    const usage = await this.usageRepository.findOne({
      select: {
        id: true,
        nom: true,
        thematique: {
          id: true,
          nom: true,
        },
        descriptionVigilance: true,
        descriptionAlerte: true,
        descriptionAlerteRenforcee: true,
        descriptionCrise: true,
        restriction: {
          niveauGravite: true,
          arreteRestriction: {
            id: true,
          },
        },
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
    let description;
    switch (usage.restriction.niveauGravite) {
      case 'vigilance':
        description = usage.descriptionVigilance;
        break;
      case 'alerte':
        description = usage.descriptionAlerte;
        break;
      case 'alerte_renforcee':
        description = usage.descriptionAlerteRenforcee;
        break;
      case 'crise':
        description = usage.descriptionCrise;
        break;
    }
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
