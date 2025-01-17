import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';

describe('StatisticsController', () => {
  let controller: StatisticsController;
  let service: StatisticsService;

  const mockStatisticsService = {
    findAll: jest.fn(), // Mock de la méthode findAll
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [
        {
          provide: StatisticsService,
          useValue: mockStatisticsService, // Injection du mock
        },
      ],
    }).compile();

    controller = <StatisticsController> module.get(StatisticsController);
    service = <StatisticsService> module.get(StatisticsService);
  });

  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('devrait appeler la méthode findAll du service', async () => {
      // Préparation du mock de réponse
      const mockStatistics = { subscriptions: 10, visits: 100 };
      // @ts-ignore
      jest.spyOn(service, 'findAll').mockReturnValue(mockStatistics);

      // Appel de la méthode du contrôleur
      const result = controller.findAll();

      // Assertions
      expect(service.findAll).toHaveBeenCalled(); // Vérifie si findAll a été appelé
      expect(result).toBe(mockStatistics); // Vérifie si la réponse est correcte
    });

    it('devrait gérer une exception si le service échoue', () => {
      // @ts-ignore
      jest.spyOn(service, 'findAll').mockImplementation(() => {
        throw new Error('Erreur lors du chargement des statistiques');
      });

      expect(() => controller.findAll()).toThrow('Erreur lors du chargement des statistiques');
    });
  });
});