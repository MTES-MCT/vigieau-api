import { Test, TestingModule } from '@nestjs/testing';
import { ZonesService } from './zones.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ZoneAlerteComputed } from './entities/zone_alerte_computed.entity';
import { DepartementsService } from '../departements/departements.service';
import { StatisticsService } from '../statistics/statistics.service';
import { DataService } from '../data/data.service';
import { CommunesService } from '../communes/communes.service';
import { ArreteMunicipal } from './entities/arrete_municipal.entity';
import { Config } from './entities/config.entity';
import { HttpException } from '@nestjs/common';
import { Commune } from './entities/commune.entity';

describe('ZonesService', () => {
  let service: ZonesService;
  let zoneAlerteComputedRepository: Repository<ZoneAlerteComputed>;
  let arreteMunicipalRepository: Repository<ArreteMunicipal>;
  let configRepository: Repository<Config>;

  const mockZoneAlerteComputedRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
      where: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
    })),
  };

  const mockArreteMunicipalRepository = {
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
    })),
  };

  const mockConfigRepository = {
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
    })),
  };

  const mockDepartementsService = {
    loadSituation: jest.fn(),
  };

  const mockStatisticsService = {
    loadStatistics: jest.fn(),
  };

  const mockDataService = {
    loadData: jest.fn(),
  };

  const mockCommunesService = {
    normalizeCodeCommune: jest.fn(),
    findArretesMunicipaux: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZonesService,
        {
          provide: getRepositoryToken(ZoneAlerteComputed),
          useValue: mockZoneAlerteComputedRepository,
        },
        {
          provide: getRepositoryToken(ArreteMunicipal),
          useValue: mockArreteMunicipalRepository,
        },
        {
          provide: getRepositoryToken(Config),
          useValue: mockConfigRepository,
        },
        { provide: DepartementsService, useValue: mockDepartementsService },
        { provide: StatisticsService, useValue: mockStatisticsService },
        { provide: DataService, useValue: mockDataService },
        { provide: CommunesService, useValue: mockCommunesService },
      ],
    }).compile();

    service = <ZonesService>module.get(ZonesService);
    zoneAlerteComputedRepository = <Repository<ZoneAlerteComputed>>module.get(
      getRepositoryToken(ZoneAlerteComputed),
    );
    arreteMunicipalRepository = <Repository<ArreteMunicipal>>module.get(
      getRepositoryToken(ArreteMunicipal),
    );
    configRepository = <Repository<Config>>module.get(getRepositoryToken(Config));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('find', () => {
    it('should throw an error if both lon/lat and commune are missing', () => {
      expect(() => service.find()).toThrowError(HttpException);
    });

    it('should call searchZonesByLonLat if lon/lat are provided', () => {
      // @ts-ignore
      jest.spyOn(service, 'searchZonesByLonLat').mockReturnValue([]);
      // @ts-ignore
      jest.spyOn(service, 'formatZones').mockReturnValue([]);

      service.find('2.123', '48.123');
      expect(service.searchZonesByLonLat).toHaveBeenCalledWith({ lon: 2.123, lat: 48.123 });
    });

    it('should call searchZonesByCommune if commune is provided', () => {
      // @ts-ignore
      jest.spyOn(service, 'searchZonesByCommune').mockReturnValue([]);
      // @ts-ignore
      jest.spyOn(service, 'formatZones').mockReturnValue([]);

      service.find(undefined, undefined, '12345');
      expect(service.searchZonesByCommune).toHaveBeenCalledWith('12345');
    });
  });

  describe('findOne', () => {
    it('should return a formatted zone if it exists', async () => {
      const mockZone = { id: 1 };
      service.allZonesWithRestrictions = [mockZone];
      // @ts-ignore
      jest.spyOn(service, 'formatZone').mockReturnValue(mockZone);

      const result = await service.findOne(1);
      expect(result).toEqual(mockZone);
    });

    it('should throw a 404 error if the zone does not exist', async () => {
      service.allZonesWithRestrictions = [];
      await expect(service.findOne(1)).rejects.toThrow(HttpException);
    });
  });

  describe('findByDepartement', () => {
    it('should return formatted zones for a valid department code', async () => {
      const mockZone = { id: 1, departement: '01' };
      service.allZonesWithRestrictions = [mockZone];
      // @ts-ignore
      jest.spyOn(service, 'formatZone').mockReturnValue(mockZone);

      const result = await service.findByDepartement('01');
      expect(result).toEqual([mockZone]);
    });

    it('should throw a 404 error if no zones are found for the department', async () => {
      service.allZonesWithRestrictions = [];
      await expect(service.findByDepartement('01')).rejects.toThrow(HttpException);
    });
  });

  describe('formatZones', () => {
    it('should return formatted zones', () => {
      const mockZones = [{ id: 1, type: 'SUP' }];
      // @ts-ignore
      jest.spyOn(service, 'formatZone');

      const result = service.formatZones(mockZones);
      expect(result).toEqual([
        {
          id: 1,
          type: 'SUP',
          arreteMunicipalCheminFichier: undefined,
          gid: undefined,
          CdZAS: undefined,
          TypeZAS: 'SUP',
        },
      ]);
    });

    it('should add zones with municipal decrees if none exist for specific types', () => {
      const mockZones = [{ id: 1, type: 'SUP' }];
      service.communeArretesMunicipaux = <Commune[]>[
        {
          code: '12345',
          arretesMunicipaux: [{ fichier: { url: 'example.com/file.pdf' } }],
        },
      ];
      // @ts-ignore
      jest.spyOn(service, 'formatZone');
      // @ts-ignore
      jest.spyOn(mockCommunesService, 'normalizeCodeCommune').mockReturnValue('12345');

      const result = service.formatZones(mockZones, undefined, undefined, '12345');
      expect(result).toEqual([
        {
          id: 1,
          type: 'SUP',
          arreteMunicipalCheminFichier: 'example.com/file.pdf',
          gid: undefined,
          CdZAS: undefined,
          TypeZAS: 'SUP',
        },
        { id: null, type: 'AEP', arreteMunicipalCheminFichier: 'example.com/file.pdf' },
        { id: null, type: 'SOU', arreteMunicipalCheminFichier: 'example.com/file.pdf' },
      ]);
    });
  });

  describe('formatZone', () => {
    it('should return null if zone is undefined and no municipal decree is provided', () => {
      const result = service.formatZone(undefined);
      expect(result).toBeNull();
    });

    it('should include municipal decree if provided', () => {
      const mockZone = { id: 1, type: 'SUP' };
      const mockArreteMunicipal = <ArreteMunicipal>{ fichier: { url: 'example.com/file.pdf' } };

      const result = service.formatZone(mockZone, undefined, mockArreteMunicipal);
      expect(result.arreteMunicipalCheminFichier).toEqual('example.com/file.pdf');
    });
  });
});