import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { UsageService } from './usage.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Usage } from '../zones/entities/usage.entity';
import { UsageFeedback } from './entities/usage_feedback.entity';

describe('UsageService', () => {
  let service: UsageService;
  let usageRepository: Repository<Usage>;
  let usageFeedbackRepository: Repository<UsageFeedback>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageService,
        {
          provide: getRepositoryToken(Usage),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(UsageFeedback),
          useClass: Repository,
        },
      ],
    }).compile();

    service = <UsageService> module.get(UsageService);
    usageRepository = <Repository<Usage>> module.get(getRepositoryToken(Usage));
    usageFeedbackRepository = <Repository<UsageFeedback>> module.get(
      getRepositoryToken(UsageFeedback),
    );
  });

  it('should throw an error if usage is not found', async () => {
    // @ts-ignore
    jest.spyOn(usageRepository, 'findOne').mockResolvedValue(null);

    await expect(service.feedback(1, 'Test feedback')).rejects.toThrow(
      new HttpException('Usage non trouvé.', HttpStatus.NOT_FOUND),
    );
  });

  it('should save feedback if usage exists', async () => {
    const mockUsage = {
      id: 1,
      nom: 'Usage Test',
      thematique: { id: 1, nom: 'Thématique Test' },
      descriptionVigilance: 'Description Vigilance',
      restriction: { niveauGravite: 'vigilance', arreteRestriction: { id: 1 } },
    };
    const mockFeedback = {
      usageNom: 'Usage Test',
      usageThematique: 'Thématique Test',
      usageDescription: 'Description Vigilance',
      arreteRestriction: { id: 1 },
      feedback: 'Test feedback',
    };

    // @ts-ignore
    jest.spyOn(usageRepository, 'findOne').mockResolvedValue(mockUsage);
    // @ts-ignore
    jest.spyOn(usageFeedbackRepository, 'save').mockResolvedValue(mockFeedback);

    const result = await service.feedback(1, 'Test feedback');

    expect(result).toEqual(mockFeedback);
    expect(usageFeedbackRepository.save).toHaveBeenCalledWith(expect.objectContaining(mockFeedback));
  });
});