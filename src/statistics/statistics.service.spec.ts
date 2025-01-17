import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsService } from './statistics.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { IsNull, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Statistic } from './entities/statistic.entity';
import { DepartementsService } from '../departements/departements.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { of } from 'rxjs';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let statisticRepository: Repository<Statistic>;
  let httpService: HttpService;
  let departementsService: DepartementsService;
  let subscriptionsService: SubscriptionsService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        {
          provide: getRepositoryToken(Statistic),
          useClass: Repository, // Mock the TypeORM repository
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(), // Mock the HTTP requests
          },
        },
        {
          provide: DepartementsService,
          useValue: {
            getAllLight: jest.fn().mockResolvedValue([
              { code: '01', region: { code: 'AU' } },
              { code: '02', region: { code: 'NA' } },
            ]), // Mock the method returning department data
          },
        },
        {
          provide: SubscriptionsService,
          useValue: {
            getAllLight: jest.fn().mockResolvedValue([
              { createdAt: new Date().toISOString() },
              { createdAt: new Date().toISOString() },
            ]), // Mock the method returning subscriptions
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                MATOMO_URL: 'http://matomo-url',
                MATOMO_API_KEY: 'matomo-api-key',
                MATOMO_ID_SITE: '1',
                OLD_MATOMO_URL: 'http://old-matomo-url',
                OLD_MATOMO_API_KEY: 'old-matomo-api-key',
                OLD_MATOMO_ID_SITE: '2',
              };
              return config[key];
            }), // Mock the environment variables
          },
        },
      ],
    }).compile();

    service = <StatisticsService> module.get(StatisticsService);
    statisticRepository = <Repository<Statistic>> module.get(getRepositoryToken(Statistic));
    httpService = <HttpService> module.get(HttpService);
    departementsService = <DepartementsService> module.get(DepartementsService);
    subscriptionsService = <SubscriptionsService> module.get(SubscriptionsService);
    configService = <ConfigService> module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return statistics', () => {
      const mockStatistics = { subscriptions: 10 };
      (service as any).statistics = mockStatistics; // Set mock data

      const result = service.findAll();

      expect(result).toEqual(mockStatistics);
    });
  });

  describe('loadStatistics', () => {
    it('should load and aggregate statistics from the repository', async () => {
      const mockStatistics = [
        {
          date: '2023-07-11',
          subscriptions: 5,
          profileRepartition: { particulier: 1, entreprise: 2 },
          departementRepartition: { '01': 1 },
          regionRepartition: { AU: 2 },
        },
        {
          date: '2023-07-12',
          subscriptions: 3,
          profileRepartition: { particulier: 2, entreprise: 1 },
          departementRepartition: { '01': 2 },
          regionRepartition: { AU: 1 },
        },
      ];

      // @ts-ignore
      jest.spyOn(statisticRepository, 'find').mockResolvedValueOnce(mockStatistics);

      await service.loadStatistics();

      expect(statisticRepository.find).toHaveBeenCalledWith({
        where: { date: MoreThanOrEqual('2023-07-11') },
        order: { date: 'ASC' },
      });
      expect(service.findAll()).toEqual({
        subscriptions: 8,
        profileRepartition: { particulier: 3, entreprise: 3 },
        departementRepartition: { '01': 3 },
        regionRepartition: { AU: 3 },
        statsByDay: [
          { date: '2023-07-11', visits: undefined, arreteDownloads: undefined, restrictionsSearch: undefined },
          { date: '2023-07-12', visits: undefined, arreteDownloads: undefined, restrictionsSearch: undefined },
        ],
      });
    });
  });

  describe('computeStatistics', () => {
    it('should compute and save statistics', async () => {
      const mockLastStat = { date: '2023-07-10' };
      const mockMatomoData = {
        data: {
          '2023-07-11': [{ label: 'CODE INSEE', nb_events: 5 }],
          '2023-07-12': [{ label: 'CODE INSEE', nb_events: 10 }],
        },
      };

      // @ts-ignore
      jest.spyOn(statisticRepository, 'findOne').mockResolvedValueOnce(mockLastStat);
      // @ts-ignore
      jest.spyOn(httpService, 'get').mockImplementation(() => of(mockMatomoData));
      // @ts-ignore
      jest.spyOn(statisticRepository, 'save').mockResolvedValue([]);
      // @ts-ignore
      jest.spyOn(statisticRepository, 'update').mockResolvedValue([]);
      // @ts-ignore
      jest.spyOn(statisticRepository, 'find').mockResolvedValue([]);

      await service.computeStatistics();

      expect(statisticRepository.findOne).toHaveBeenCalledWith({
        where: { id: Not(IsNull()) },
        order: { date: 'DESC' },
      });

      expect(statisticRepository.save).toHaveBeenCalled(); // Ensure stats are saved
    });
  });

  describe('generateDateString', () => {
    it('should return a formatted date string', () => {
      const date = new Date('2023-07-11T00:00:00Z');
      const result = service.generateDateString(date);

      expect(result).toBe('2023-07-11');
    });
  });
});