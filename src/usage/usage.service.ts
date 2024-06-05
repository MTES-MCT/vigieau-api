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

  async feedback(usageId: number) {
    const usage = await this.usageRepository.findOne({ where: {id: usageId}});
    if(!usage) {
      throw new HttpException(
        `Usage non trouvé.`,
        HttpStatus.NOT_FOUND,
      );
    }
    return this.usageFeedbackRepository.save({usage});
  }
}
