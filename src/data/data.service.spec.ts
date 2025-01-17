import { Test, TestingModule } from '@nestjs/testing';
import { DataService } from './data.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StatisticDepartement } from './entities/statistic_departement.entity';
import { StatisticCommune } from './entities/statistic_commune.entity';
import { Commune } from '../zones/entities/commune.entity';
import { Departement } from '../zones/entities/departement.entity';
import { Region } from '../zones/entities/region.entity';
import { BassinVersant } from '../zones/entities/bassin_versant.entity';
import { HttpException, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';

describe('DataService', () => {
  let service: DataService;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
    })),
  };

  const mockDataSource = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataService,
        { provide: getRepositoryToken(StatisticDepartement), useValue: mockRepository },
        { provide: getRepositoryToken(StatisticCommune), useValue: mockRepository },
        { provide: getRepositoryToken(Commune), useValue: mockRepository },
        { provide: getRepositoryToken(Departement), useValue: mockRepository },
        { provide: getRepositoryToken(Region), useValue: mockRepository },
        { provide: getRepositoryToken(BassinVersant), useValue: mockRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = <DataService>module.get(DataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRefData', () => {
    it('should return formatted reference data', () => {
      service['bassinsVersants'] = <BassinVersant[]>[
        { id: 1, code: 1, nom: 'Bassin 1', departements: [{ id: 1, code: 'D01' }] },
      ];
      service['regions'] = <Region[]>[
        { id: 2, code: 'R01', nom: 'Region 1', departements: [{ id: 2, code: 'D02' }] },
      ];
      service['departements'] = [
        { id: 1, code: 'D01', nom: 'Departement 1', bounds: 'bounds1' },
        { id: 2, code: 'D02', nom: 'Departement 2', bounds: 'bounds2' },
      ];

      const result = service.getRefData();

      expect(result).toEqual({
        bassinsVersants: [
          { id: 1, code: 1, nom: 'Bassin 1', departements: [{ id: 1, code: 'D01' }] },
        ],
        regions: [
          { id: 2, code: 'R01', nom: 'Region 1', departements: [{ id: 2, code: 'D02' }] },
        ],
        departements: [
          { id: 1, code: 'D01', nom: 'Departement 1', bounds: 'bounds1' },
          { id: 2, code: 'D02', nom: 'Departement 2', bounds: 'bounds2' },
        ],
      });
    });
  });

  describe('areaFindByDate', () => {
    it('should filter data by date and return global data', () => {
      service['dataArea'] = [
        { date: '2023-01-01', ESO: 10, ESU: 20, AEP: 30 },
        { date: '2023-02-01', ESO: 15, ESU: 25, AEP: 35 },
      ];

      const result = service.areaFindByDate('2023-01-01', '2023-01-31');

      expect(result).toEqual([
        { date: '2023-01-01', ESO: 10, ESU: 20, AEP: 30 },
      ]);
    });

    it('should throw an error if bassin versant is not found', () => {
      service['bassinsVersants'] = [];

      expect(() => service.areaFindByDate(undefined, undefined, '1')).toThrow(HttpException);
    });
  });

  describe('commune', () => {
    it('should return commune data for a valid code', async () => {
      const mockStat = {
        id: 1,
        restrictions: [],
        commune: { id: 1, code: '12345', nom: 'Commune 1' },
      };

      mockRepository.findOne.mockResolvedValue(mockStat);

      const result = await service.commune('12345');

      expect(result).toEqual(mockStat);
    });

    it('should throw an error if the commune is not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.commune('99999')).rejects.toThrow(HttpException);
    });

    it('should filter restrictions by date', async () => {
      const mockStat = {
        id: 1,
        restrictions: [],
        commune: { id: 1, code: '12345', nom: 'Commune 1' },
      };

      mockRepository.findOne.mockResolvedValue(mockStat);
      // @ts-ignore
      service['dataSource'] = {
        query: jest.fn().mockResolvedValue([{ filtered_restrictions: [{ date: '2023-01-01' }] }]),
      };

      const result = await service.commune('12345', '2023-01', '2023-02');

      expect(result.restrictions).toEqual([{ date: '2023-01-01' }]);
    });
  });

  describe('departementFindByDate', () => {
    it('should filter data by departement', () => {
      service['dataDepartement'] = [
        {
          date: '2023-01-01',
          departements: [{ id: 1, code: 'D01', niveauGravite: 'vigilance' }],
        },
        {
          date: '2023-02-01',
          departements: [{ id: 1, code: 'D01', niveauGravite: 'alerte' }],
        },
      ];
      service['departements'] = [
        { id: 1, code: 'D01', niveauGravite: 'alerte' },
      ];

      const result = service.departementFindByDate('2023-01-01', '2023-01-31', undefined, undefined, '1');

      expect(result).toEqual([
        {
          date: '2023-01-01',
          departements: [{ id: 1, code: 'D01', niveauGravite: 'vigilance' }],
        },
      ]);
    });

    it('should throw an error if the departement is not found', () => {
      service['departements'] = [];

      expect(() => service.departementFindByDate(undefined, undefined, undefined, undefined, '999')).toThrow(
        HttpException,
      );
    });
  });
});