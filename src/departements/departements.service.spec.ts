import { Test, TestingModule } from '@nestjs/testing';
import { DepartementsService } from './departements.service';
import { Repository } from 'typeorm';
import { Departement } from '../zones/entities/departement.entity';
import { Statistic } from '../statistics/entities/statistic.entity';
import { Region } from '../zones/entities/region.entity';
import { BassinVersant } from '../zones/entities/bassin_versant.entity';
import { VigieauLogger } from '../logger/vigieau.logger';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('DepartementsService', () => {
  let service: DepartementsService;
  let mockDepartementRepository: Partial<Repository<Departement>>;
  let mockStatisticRepository: Partial<Repository<Statistic>>;
  let mockRegionRepository: Partial<Repository<Region>>;
  let mockBassinVersantRepository: Partial<Repository<BassinVersant>>;

  beforeEach(async () => {
    // Mock des repositories
    mockDepartementRepository = {
      find: jest.fn(),
    };
    mockStatisticRepository = {
      find: jest.fn(),
    };
    mockRegionRepository = {
      find: jest.fn(),
    };
    mockBassinVersantRepository = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartementsService,
        { provide: getRepositoryToken(Departement), useValue: mockDepartementRepository },
        { provide: getRepositoryToken(Statistic), useValue: mockStatisticRepository },
        { provide: getRepositoryToken(Region), useValue: mockRegionRepository },
        { provide: getRepositoryToken(BassinVersant), useValue: mockBassinVersantRepository },
        VigieauLogger,
      ],
    }).compile();

    service = <DepartementsService> module.get(DepartementsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllLight', () => {
    it('should return a list of light departements', async () => {
      const mockDepartements = [
        { id: 1, code: '75', region: { id: 1, code: 'IDF' } },
        { id: 2, code: '33', region: { id: 2, code: 'NAQ' } },
      ];
      mockDepartementRepository.find = jest.fn().mockResolvedValue(mockDepartements);

      const result = await service.getAllLight();

      expect(mockDepartementRepository.find).toHaveBeenCalledWith({
        select: {
          id: true,
          code: true,
          region: { id: true, code: true },
        },
        relations: ['region'],
      });
      expect(result).toEqual(mockDepartements);
    });
  });

  describe('situationByDepartement', () => {
    it('should throw an exception if the date is not found', () => {
      service['situationDepartements'] = [];

      expect(() => service.situationByDepartement('2023-01-01')).toThrow(
        new HttpException('Date non disponible.', HttpStatus.NOT_FOUND),
      );
    });

    it('should filter by bassin versant', () => {
      const mockSituation = {
        date: '2023-01-01',
        departementSituation: [{ code: '75', niveauGraviteMax: 'Alerte' }],
      };
      const mockBassinVersant = {
        id: 1,
        departements: [{ code: '75' }],
      };

      service['situationDepartements'] = [mockSituation];
      service['bassinsVersants'] = <any> [mockBassinVersant];

      const result = service.situationByDepartement('2023-01-01', '1');

      expect(result).toEqual([{ code: '75', niveauGraviteMax: 'Alerte' }]);
    });

    it('should throw an exception if bassin versant is not found', () => {
      const mockSituation = {
        date: '2023-01-01',
        departementSituation: [{ code: '75', niveauGraviteMax: 'Alerte' }],
      };
      service['situationDepartements'] = [mockSituation];
      service['bassinsVersants'] = [];

      expect(() => service.situationByDepartement('2023-01-01', '999')).toThrow(
        new HttpException('Bassin versant non trouvé.', HttpStatus.NOT_FOUND),
      );
    });

    it('should filter by region', () => {
      const mockSituation = {
        date: '2023-01-01',
        departementSituation: [{ code: '75', niveauGraviteMax: 'Alerte' }],
      };
      const mockRegion = {
        id: 1,
        departements: [{ code: '75' }],
      };

      service['situationDepartements'] = [mockSituation];
      service['regions'] = <any> [mockRegion];

      const result = service.situationByDepartement('2023-01-01', undefined, '1');

      expect(result).toEqual([{ code: '75', niveauGraviteMax: 'Alerte' }]);
    });

    it('should throw an exception if region is not found', () => {
      const mockSituation = {
        date: '2023-01-01',
        departementSituation: [{ code: '75', niveauGraviteMax: 'Alerte' }],
      };
      service['situationDepartements'] = [mockSituation];
      service['regions'] = [];

      expect(() => service.situationByDepartement('2023-01-01', undefined, '999')).toThrow(
        new HttpException('Région non trouvée.', HttpStatus.NOT_FOUND),
      );
    });

    it('should filter by departement', () => {
      const mockSituation = {
        date: '2023-01-01',
        departementSituation: [{ code: '75', niveauGraviteMax: 'Alerte' }],
      };
      const mockDepartement = { id: 1, code: '75' };

      service['situationDepartements'] = [mockSituation];
      service['departements'] = [mockDepartement];

      const result = service.situationByDepartement('2023-01-01', undefined, undefined, '1');

      expect(result).toEqual([{ code: '75', niveauGraviteMax: 'Alerte' }]);
    });

    it('should throw an exception if departement is not found', () => {
      const mockSituation = {
        date: '2023-01-01',
        departementSituation: [{ code: '75', niveauGraviteMax: 'Alerte' }],
      };
      service['situationDepartements'] = [mockSituation];
      service['departements'] = [];

      expect(() => service.situationByDepartement('2023-01-01', undefined, undefined, '999')).toThrow(
        new HttpException('Département non trouvé.', HttpStatus.NOT_FOUND),
      );
    });

    it('should return all departements if no filter is applied', () => {
      const mockSituation = {
        date: '2023-01-01',
        departementSituation: [{ code: '75', niveauGraviteMax: 'Alerte' }],
      };

      service['situationDepartements'] = [mockSituation];

      const result = service.situationByDepartement('2023-01-01');

      expect(result).toEqual([{ code: '75', niveauGraviteMax: 'Alerte' }]);
    });
  });

  describe('loadRefData', () => {
    it('should load reference data (departements, regions, bassins versants)', async () => {
      const mockDepartements = [{ id: 1, nom: 'Paris' }];
      const mockRegions = [{ id: 1, nom: 'Île-de-France', departements: mockDepartements }];
      const mockBassinsVersants = [{ id: 1, nom: 'Bassin 1', departements: mockDepartements }];

      mockDepartementRepository.find = jest.fn().mockResolvedValue(mockDepartements);
      mockRegionRepository.find = jest.fn().mockResolvedValue(mockRegions);
      mockBassinVersantRepository.find = jest.fn().mockResolvedValue(mockBassinsVersants);

      await service.loadRefData();

      expect(service['departements']).toEqual(mockDepartements);
      expect(service['regions']).toEqual(mockRegions);
      expect(service['bassinsVersants']).toEqual(mockBassinsVersants);

      expect(mockDepartementRepository.find).toHaveBeenCalledWith({ order: { nom: 'ASC' } });
      expect(mockRegionRepository.find).toHaveBeenCalledWith({
        relations: ['departements'],
        order: { nom: 'ASC' },
      });
      expect(mockBassinVersantRepository.find).toHaveBeenCalledWith({
        relations: ['departements'],
        order: { nom: 'ASC' },
      });
    });
  });

  describe('loadSituation', () => {
    it('should load departement situations based on statistics and current zones', async () => {
      const mockDepartements = [{ code: '75', nom: 'Paris', region: { nom: 'Île-de-France' } }];
      const mockStatistics = [
        {
          date: '2023-01-01',
          departementSituation: {
            '75': { max: 'Alerte', sup: 'Alerte', sou: 'Alerte', aep: 'Alerte' },
          },
        },
      ];
      const mockCurrentZones = [{ departement: '75', niveauGravite: 'Alerte', type: 'SUP' }];

      mockDepartementRepository.find = jest.fn().mockResolvedValue(mockDepartements);
      mockStatisticRepository.find = jest.fn().mockResolvedValue(mockStatistics);

      await service.loadSituation(mockCurrentZones);

      expect(service['situationDepartements']).toEqual([
        {
          date: '2023-01-01',
          departementSituation: [
            {
              code: '75',
              nom: 'Paris',
              region: 'Île-de-France',
              niveauGraviteMax: 'Alerte',
              niveauGraviteSupMax: 'Alerte',
              niveauGraviteSouMax: 'Alerte',
              niveauGraviteAepMax: 'Alerte',
            },
          ],
        },
      ]);
    });
  });
});