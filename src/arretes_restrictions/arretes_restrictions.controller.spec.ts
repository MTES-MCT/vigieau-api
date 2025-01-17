import { Test, TestingModule } from '@nestjs/testing';
import { ArretesRestrictionsController } from './arretes_restrictions.controller';
import { ArretesRestrictionsService } from './arretes_restrictions.service';
import { ArreteRestrictionDto, ArretesRestrictionsQueryDto } from './dto/arrete_restriction.dto';

describe('ArretesRestrictionsController', () => {
  let controller: ArretesRestrictionsController;
  let service: ArretesRestrictionsService;

  // Mock des données simulées pour les tests
  const mockArretesRestrictionsService = {
    getByDate: jest.fn(),
  };

  const mockArretesData: ArreteRestrictionDto[] = <ArreteRestrictionDto[]>[
    {
      id: '1',
      numero: '2023-001',
      dateDebut: new Date('2023-01-01'),
      dateFin: new Date('2023-12-31'),
      dateSignature: new Date('2023-01-01'),
      departement: { code: '75', nom: 'Paris' },
      fichier: { nom: 'arrete.pdf', url: 'http://example.com/arrete.pdf', size: 1234 },
      types: ['ESO', 'ESU', 'AEP'],
      niveauGraviteMax: 'alerte',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArretesRestrictionsController],
      providers: [
        { provide: ArretesRestrictionsService, useValue: mockArretesRestrictionsService },
      ],
    }).compile();

    controller = <ArretesRestrictionsController>module.get(ArretesRestrictionsController);
    service = <ArretesRestrictionsService>module.get(ArretesRestrictionsService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Réinitialise les appels à toutes les fonctions mockées
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('situationByDepartement', () => {
    it('should return a list of arretes when called with valid parameters', async () => {
      // Arrange
      const query: ArretesRestrictionsQueryDto = {
        date: '2023-01-01',
        bassinVersant: 'Loire-Bretagne',
        region: 'Centre',
        departement: '45',
      };

      mockArretesRestrictionsService.getByDate.mockResolvedValue(mockArretesData);

      // Act
      const result = await controller.situationByDepartement(query);

      // Assert
      expect(result).toEqual(mockArretesData);
      expect(mockArretesRestrictionsService.getByDate).toHaveBeenCalledWith(
        query.date,
        query.bassinVersant,
        query.region,
        query.departement,
      );
      expect(mockArretesRestrictionsService.getByDate).toHaveBeenCalledTimes(1);
    });

    it('should return a list of arretes when called without parameters', async () => {
      // Arrange
      const query: ArretesRestrictionsQueryDto = {}; // Aucun paramètre fourni
      mockArretesRestrictionsService.getByDate.mockResolvedValue(mockArretesData);

      // Act
      const result = await controller.situationByDepartement(query);

      // Assert
      expect(result).toEqual(mockArretesData);
      expect(mockArretesRestrictionsService.getByDate).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(mockArretesRestrictionsService.getByDate).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the service throws an exception', async () => {
      // Arrange
      const query: ArretesRestrictionsQueryDto = { date: '2023-01-01' };
      mockArretesRestrictionsService.getByDate.mockRejectedValue(new Error('Something went wrong'));

      // Act & Assert
      await expect(controller.situationByDepartement(query)).rejects.toThrow('Something went wrong');
      expect(mockArretesRestrictionsService.getByDate).toHaveBeenCalledWith(
        query.date,
        undefined,
        undefined,
        undefined,
      );
      expect(mockArretesRestrictionsService.getByDate).toHaveBeenCalledTimes(1);
    });
  });
});