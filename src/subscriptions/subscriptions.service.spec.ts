import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';
import { Repository } from 'typeorm';
import { CommunesService } from '../communes/communes.service';
import { HttpService } from '@nestjs/axios';
import { ZonesService } from '../zones/zones.service';
import { BrevoService } from '../brevo/brevo.service';
import { MattermostService } from '../mattermost/mattermost.service';
import { CronService } from '../cron/cron.service';
import { AbonnementMail } from '../zones/entities/abonnement_mail.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { of, throwError } from 'rxjs';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let abonnementMailRepository: Repository<AbonnementMail>;
  let communesService: CommunesService;
  let zonesService: ZonesService;
  let brevoService: BrevoService;
  let mattermostService: MattermostService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getRepositoryToken(AbonnementMail),
          useClass: Repository,
        },
        {
          provide: CommunesService,
          useValue: {
            getCommune: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: ZonesService,
          useValue: {
            searchZonesByLonLat: jest.fn(),
            searchZonesByCommune: jest.fn(),
            loadAllZones: jest.fn(),
          },
        },
        {
          provide: BrevoService,
          useValue: {
            sendMail: jest.fn(),
            computeUnsubscribeUrl: jest.fn(),
            sendSituationUpdate: jest.fn(),
          },
        },
        {
          provide: MattermostService,
          useValue: {
            sendMessage: jest.fn(),
          },
        },
        {
          provide: CronService,
          useValue: {
            askForLock: jest.fn(),
            unlock: jest.fn(),
          },
        },
      ],
    }).compile();

    service = <SubscriptionsService>module.get(SubscriptionsService);
    abonnementMailRepository = <Repository<AbonnementMail>>module.get(getRepositoryToken(AbonnementMail));
    communesService = <CommunesService>module.get(CommunesService);
    zonesService = <ZonesService>module.get(ZonesService);
    brevoService = <BrevoService>module.get(BrevoService);
    mattermostService = <MattermostService>module.get(MattermostService);
    httpService = <HttpService>module.get(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllLight', () => {
    it('should return all subscriptions with selected fields', async () => {
      const mockData = [{ id: 1, email: 'test@test.com', createdAt: new Date() }];
      // @ts-ignore
      jest.spyOn(abonnementMailRepository, 'find').mockResolvedValue(mockData);

      const result = await service.getAllLight();
      expect(result).toEqual(mockData);
      expect(abonnementMailRepository.find).toHaveBeenCalledWith({
        select: ['id', 'email', 'createdAt'],
      });
    });
  });

  describe('create', () => {
    it('should create a subscription and send a confirmation email', async () => {
      const mockSubscription = {
        email: 'test@test.com',
        commune: '12345',
        typesEau: ['AEP'],
      };
      const mockCommune = { nom: 'Test Commune' };
      const mockSavedSubscription = {
        ...mockSubscription,
        id: 1,
        createdAt: new Date(),
        situation: {},
      };

      // @ts-ignore
      jest.spyOn(communesService, 'getCommune').mockReturnValue(mockCommune);
      // @ts-ignore
      jest.spyOn(abonnementMailRepository, 'exists').mockResolvedValue(false);
      // @ts-ignore
      jest.spyOn(abonnementMailRepository, 'save').mockResolvedValue(mockSavedSubscription as any);
      // @ts-ignore
      jest.spyOn(brevoService, 'sendMail').mockResolvedValue(undefined);

      const result = await service.create(mockSubscription as any, '127.0.0.1');
      expect(result).toEqual({
        ...mockSubscription,
        ip: '127.0.0.1',
        libelleLocalisation: 'Test Commune',
        situation: {},
      });
      expect(abonnementMailRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@test.com',
          commune: '12345',
          libelleLocalisation: 'Test Commune',
          typesEau: ['AEP'],
        }),
      );
      expect(brevoService.sendMail).toHaveBeenCalledWith(
        29,
        'test@test.com',
        expect.objectContaining({
          city: 'Test Commune',
        }),
      );
    });

    it('should update an existing subscription if it already exists', async () => {
      const mockSubscription = {
        email: 'test@test.com',
        commune: '12345',
        typesEau: ['AEP'],
      };

      // @ts-ignore
      jest.spyOn(communesService, 'getCommune').mockReturnValue({ nom: 'Test Commune' });
      // @ts-ignore
      jest.spyOn(abonnementMailRepository, 'exists').mockResolvedValue(true);
      // @ts-ignore
      jest.spyOn(abonnementMailRepository, 'update').mockResolvedValue(undefined);

      const result = await service.create(mockSubscription as any, '127.0.0.1');
      expect(result).toEqual(
        {
          email: 'test@test.com',
          commune: '12345',
          typesEau: ['AEP'],
          ip: '127.0.0.1',
          libelleLocalisation: 'Test Commune',
          situation: {},
        },
      );
      expect(abonnementMailRepository.update).toHaveBeenCalled();
    });

    it('should throw an error if commune is invalid', async () => {
      // @ts-ignore
      jest.spyOn(communesService, 'getCommune').mockReturnValue(null);

      await expect(
        service.create({ commune: 'invalid' } as any, '127.0.0.1'),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('resolveIdAdresse', () => {
    it('should resolve address ID successfully', async () => {
      const mockAddress = {
        data: { commune: { code: '12345', nom: 'City' }, type: 'numero', numero: '10', voie: { nomVoie: 'Main St' } },
      };

      // @ts-ignore
      jest.spyOn(httpService, 'get').mockReturnValue(of(mockAddress));

      const result = await service.resolveIdAdresse('123');
      expect(result).toEqual({
        libelle: '10, Main St, City',
        commune: '12345',
      });
    });

    it('should throw an error if address ID is invalid', async () => {
      // @ts-ignore
      jest.spyOn(httpService, 'get').mockReturnValue(throwError({ response: { statusCode: 404 } }));

      await expect(service.resolveIdAdresse('invalid')).rejects.toThrow(HttpException);
    });
  });

  describe('computeNiveauxAlerte', () => {
    it('should compute alert levels for a location', () => {
      // @ts-ignore
      jest.spyOn(zonesService, 'searchZonesByLonLat').mockReturnValue([
        { type: 'AEP', niveauGravite: 'vigilance', idZone: 1 },
      ]);

      const result = service.computeNiveauxAlerte({ lon: 1, lat: 1, commune: '12345' });
      expect(result).toEqual({
        AEP: 'vigilance',
        SOU: 'pas_restriction',
        SUP: 'pas_restriction',
        zones: [1],
      });
    });
  });
});
