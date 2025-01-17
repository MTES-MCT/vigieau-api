import { Test, TestingModule } from '@nestjs/testing';
import { DepartementsController } from './departements.controller';
import { DepartementsService } from './departements.service';
import { DepartementDto, QueryDepartementDto } from './dto/departement.dto';

describe('DepartementsController', () => {
  let controller: DepartementsController;
  let service: DepartementsService;

  const mockDepartementsService = {
    situationByDepartement: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DepartementsController],
      providers: [
        {
          provide: DepartementsService,
          useValue: mockDepartementsService,
        },
      ],
    }).compile();

    controller = <DepartementsController>module.get(DepartementsController);
    service = <DepartementsService>module.get(DepartementsService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Nettoie les mocks après chaque test
  });

  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  describe('situationByDepartement', () => {
    it('devrait appeler le service avec des paramètres valides et retourner un tableau de départements', async () => {
      // Arrange
      const query: QueryDepartementDto = {
        date: '2023-12-01',
        bassinVersant: '1',
        region: '2',
        departement: '3',
      };

      const expectedResult: any[] = [
        { code: '3', niveauGravite: 'crise' },
        { code: '4', niveauGravite: 'alerte' },
      ];

      mockDepartementsService.situationByDepartement.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.situationByDepartement(query);

      // Assert
      expect(service.situationByDepartement).toHaveBeenCalledWith(
        query.date,
        query.bassinVersant,
        query.region,
        query.departement,
      );
      expect(result).toEqual(expectedResult);
    });

    it('devrait appeler le service avec des paramètres par défaut si aucun n’est fourni', async () => {
      // Arrange
      const query: QueryDepartementDto = {}; // Aucun paramètre fourni
      const expectedResult: DepartementDto[] = [];

      mockDepartementsService.situationByDepartement.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.situationByDepartement(query);

      // Assert
      expect(service.situationByDepartement).toHaveBeenCalledWith(undefined, undefined, undefined, undefined);
      expect(result).toEqual(expectedResult);
    });
  });
});