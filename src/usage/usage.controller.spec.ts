import { Test, TestingModule } from '@nestjs/testing';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';
import { UsageFeedbackDto } from './dto/usage_feedback.dto';

describe('UsageController', () => {
  let controller: UsageController;
  let usageService: UsageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsageController],
      providers: [
        {
          provide: UsageService,
          useValue: {
            feedback: jest.fn(), // Mock du service
          },
        },
      ],
    }).compile();

    controller = <UsageController> module.get(UsageController);
    usageService = <UsageService> module.get(UsageService);
  });

  it('should call usageService.feedback with correct parameters', async () => {
    const feedbackDto: UsageFeedbackDto = { feedback: 'Test feedback' };
    const usageId = 1;
    const expectedResponse = { id: usageId, feedback: 'Test feedback' };

    // @ts-ignore
    jest.spyOn(usageService, 'feedback').mockResolvedValue(expectedResponse);

    const result = await controller.feedback(usageId, feedbackDto);

    expect(usageService.feedback).toHaveBeenCalledWith(usageId, 'Test feedback');
    expect(result).toEqual(expectedResponse);
  });

  it('should throw an error if usageService.feedback fails', async () => {
    const feedbackDto: UsageFeedbackDto = { feedback: 'Test feedback' };
    const usageId = 1;

    // @ts-ignore
    jest.spyOn(usageService, 'feedback').mockRejectedValue(new Error('Error'));

    await expect(controller.feedback(usageId, feedbackDto)).rejects.toThrow('Error');
  });
});