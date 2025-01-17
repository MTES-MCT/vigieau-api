import { Test, TestingModule } from '@nestjs/testing';
import { DataController } from './data.controller';
import { DataService } from './data.service';
import { CommonDataQueryDto, CommuneQueryDto } from './dto/data.dto';

describe('DataController', () => {
  let controller: DataController;
  let service: DataService;

  const mockDataService = {
    getRefData: jest.fn(),
    areaFindByDate: jest.fn(),
    departementFindByDate: jest.fn(),
    duree: jest.fn(),
    commune: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DataController],
      providers: [
        {
          provide: DataService,
          useValue: mockDataService,
        },
      ],
    }).compile();

    controller = <DataController> module.get(DataController);
    service = <DataService> module.get(DataService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Nettoyer les mocks après chaque test
  });

  it('devrait être défini', () => {
    expect(controller).toBeDefined();
  });

  describe('refData', () => {
    it('devrait appeler la méthode getRefData du service et retourner les données', async () => {
      // Arrange
      const expectedResult = { regions: [], departements: [], bassinsVersants: [] };
      mockDataService.getRefData.mockReturnValue(expectedResult);

      // Act
      const result = controller.refData();

      // Assert
      expect(service.getRefData).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('area', () => {
    it('devrait appeler areaFindByDate avec les bons paramètres et retourner les résultats', async () => {
      // Arrange
      const query: CommonDataQueryDto = {
        dateDebut: '2023-01-01',
        dateFin: '2023-12-31',
        bassinVersant: '1',
        region: '2',
        departement: '3',
      };
      const expectedResult = [{ date: '2023-01-01', ESO: 10, ESU: 20, AEP: 30 }];
      mockDataService.areaFindByDate.mockReturnValue(expectedResult);

      // Act
      const result = controller.area(query);

      // Assert
      expect(service.areaFindByDate).toHaveBeenCalledWith(
        query.dateDebut,
        query.dateFin,
        query.bassinVersant,
        query.region,
        query.departement,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('departement', () => {
    it('devrait appeler departementFindByDate avec les bons paramètres et retourner les résultats', async () => {
      // Arrange
      const query: CommonDataQueryDto = {
        dateDebut: '2023-01-01',
        dateFin: '2023-12-31',
        bassinVersant: '1',
        region: '2',
        departement: '3',
      };
      const expectedResult = [{ code: '3', niveauGravite: 'alerte' }];
      mockDataService.departementFindByDate.mockReturnValue(expectedResult);

      // Act
      const result = controller.departement(query);

      // Assert
      expect(service.departementFindByDate).toHaveBeenCalledWith(
        query.dateDebut,
        query.dateFin,
        query.bassinVersant,
        query.region,
        query.departement,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('duree', () => {
    it('devrait appeler la méthode duree du service et retourner les données', async () => {
      // Arrange
      const expectedResult = [{ commune: 'Commune1', restrictions: [] }];
      mockDataService.duree.mockReturnValue(expectedResult);

      // Act
      const result = controller.duree();

      // Assert
      expect(service.duree).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('commune', () => {
    it('devrait appeler commune avec les bons paramètres et retourner les résultats', async () => {
      // Arrange
      const codeInsee = '12345';
      const query: CommuneQueryDto = {
        dateDebut: '2023-01',
        dateFin: '2023-12',
      };
      const expectedResult = { code: '12345', restrictions: [] };
      mockDataService.commune.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.commune(codeInsee, query);

      // Assert
      expect(service.commune).toHaveBeenCalledWith(
        codeInsee,
        query.dateDebut,
        query.dateFin,
      );
      expect(result).toEqual(expectedResult);
    });

    it('devrait lever une exception si une erreur survient dans le service', async () => {
      // Arrange
      const codeInsee = '12345';
      const query: CommuneQueryDto = {
        dateDebut: '2023-01',
        dateFin: '2023-12',
      };
      mockDataService.commune.mockRejectedValue(new Error('Erreur dans le service'));

      // Act & Assert
      await expect(controller.commune(codeInsee, query)).rejects.toThrowError('Erreur dans le service');
      expect(service.commune).toHaveBeenCalledWith(
        codeInsee,
        query.dateDebut,
        query.dateFin,
      );
    });
  });
});