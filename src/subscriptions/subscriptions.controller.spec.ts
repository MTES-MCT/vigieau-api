import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create_subscription.dto';
import { SubscriptionDto } from './dto/subscription.dto';
import { NotFoundException } from '@nestjs/common';

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;
  let service: SubscriptionsService;

  // Mock pour le service des abonnements
  const mockSubscriptionsService = {
    create: jest.fn(),
    getSubscriptionsByEmail: jest.fn(),
    deleteSubscriptionById: jest.fn(),
    deleteSubscriptionByEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        {
          provide: SubscriptionsService,
          useValue: mockSubscriptionsService,
        },
      ],
    }).compile();

    controller = <SubscriptionsController>module.get(SubscriptionsController);
    service = <SubscriptionsService>module.get(SubscriptionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a subscription', async () => {
      const createSubscriptionDto: CreateSubscriptionDto = <any>{
        email: 'test@example.com',
        topic: 'water-alert',
      };
      const expectedResult: SubscriptionDto = <any>{
        id: '1',
        email: 'test@example.com',
        topic: 'water-alert',
        createdAt: new Date(),
      };

      // Mock du service
      mockSubscriptionsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(
        { user: { email: 'test@example.com' }, headers: { 'x-forwarded-for': '127.0.0.1' } } as any,
        createSubscriptionDto,
      );

      expect(result).toEqual(expectedResult);
      expect(mockSubscriptionsService.create).toHaveBeenCalledWith(
        createSubscriptionDto,
        '127.0.0.1',
      );
    });
  });

  describe('getAll', () => {
    it('should return all subscriptions for the user\'s email', async () => {
      const mockEmail = 'test@example.com';
      const expectedResult: SubscriptionDto[] = <any[]>[
        {
          id: '1',
          email: 'test@example.com',
          topic: 'water-alert',
          createdAt: new Date(),
        },
        {
          id: '2',
          email: 'test@example.com',
          topic: 'drought-warning',
          createdAt: new Date(),
        },
      ];

      // Mock du service
      mockSubscriptionsService.getSubscriptionsByEmail.mockResolvedValue(expectedResult);

      const result = await controller.getAll({ user: { email: mockEmail } } as any);

      expect(result).toEqual(expectedResult);
      expect(mockSubscriptionsService.getSubscriptionsByEmail).toHaveBeenCalledWith(mockEmail);
    });

    it('should return an empty array if no subscriptions are found', async () => {
      const mockEmail = 'unknown@example.com';
      const expectedResult: SubscriptionDto[] = [];

      mockSubscriptionsService.getSubscriptionsByEmail.mockResolvedValue(expectedResult);

      const result = await controller.getAll({ user: { email: mockEmail } } as any);

      expect(result).toEqual(expectedResult);
      expect(mockSubscriptionsService.getSubscriptionsByEmail).toHaveBeenCalledWith(mockEmail);
    });
  });

  describe('remove', () => {
    it('should delete a subscription by ID', async () => {
      const mockId = '1';
      const mockEmail = 'test@example.com';

      // Mock du service
      mockSubscriptionsService.deleteSubscriptionById.mockResolvedValue(undefined);

      const result = await controller.remove({ user: { email: mockEmail } } as any, mockId);

      expect(result).toBeUndefined(); // La méthode ne retourne rien (status 204)
      expect(mockSubscriptionsService.deleteSubscriptionById).toHaveBeenCalledWith(mockId, mockEmail);
    });

    it('should throw an error if the subscription does not exist', async () => {
      const mockId = '999';
      const mockEmail = 'test@example.com';

      mockSubscriptionsService.deleteSubscriptionById.mockRejectedValue(
        new NotFoundException('Subscription not found'),
      );

      await expect(
        controller.remove({ user: { email: mockEmail } } as any, mockId),
      ).rejects.toThrow(NotFoundException);
      expect(mockSubscriptionsService.deleteSubscriptionById).toHaveBeenCalledWith(mockId, mockEmail);
    });
  });

  describe('removeAll', () => {
    it('should delete all subscriptions for the user', async () => {
      const mockEmail = 'test@example.com';

      // Mock du service
      mockSubscriptionsService.deleteSubscriptionByEmail.mockResolvedValue(undefined);

      const result = await controller.removeAll({ user: { email: mockEmail } } as any);

      expect(result).toBeUndefined(); // La méthode ne retourne rien (status 204)
      expect(mockSubscriptionsService.deleteSubscriptionByEmail).toHaveBeenCalledWith(mockEmail);
    });

    it('should handle cases where there are no subscriptions to delete', async () => {
      const mockEmail = 'unknown@example.com';

      mockSubscriptionsService.deleteSubscriptionByEmail.mockResolvedValue(undefined);

      const result = await controller.removeAll({ user: { email: mockEmail } } as any);

      expect(result).toBeUndefined();
      expect(mockSubscriptionsService.deleteSubscriptionByEmail).toHaveBeenCalledWith(mockEmail);
    });
  });
});