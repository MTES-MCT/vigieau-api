import { Test, TestingModule } from '@nestjs/testing';
import { Commune } from '../zones/entities/commune.entity';
import { CommunesService } from './communes.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VigieauLogger } from '../logger/vigieau.logger';

describe('CommunesService', () => {
  let service: CommunesService;
  let communeRepository: Repository<Commune>;

  const mockCommunes: Commune[] = <Commune[]> [
    { id: 1, code: '75001', nom: 'Commune 1', disabled: false },
    { id: 2, code: '13201', nom: 'Commune 2', disabled: false },
    { id: 3, code: '75056', nom: 'Paris', disabled: false },
    { id: 4, code: '13055', nom: 'Marseille', disabled: false },
  ];

  const mockArretesMunicipaux = [
    {
      id: 1,
      code: '75001',
      arretesMunicipaux: [
        { id: 101, fichier: { url: 'http://example.com/arrete1.pdf' } },
      ],
    },
    {
      id: 2,
      code: '13201',
      arretesMunicipaux: [
        { id: 102, fichier: { url: 'http://example.com/arrete2.pdf' } },
      ],
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunesService,
        {
          provide: getRepositoryToken(Commune),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: VigieauLogger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = <CommunesService>module.get(CommunesService);
    communeRepository = <Repository<Commune>>module.get(getRepositoryToken(Commune));
  });

  afterEach(() => {
    jest.clearAllMocks(); // Réinitialise tous les mocks après chaque test
  });

  describe('getCommune', () => {
    it('devrait retourner la commune correspondante au code', async () => {
      // @ts-ignore
      jest.spyOn(service, 'loadCommunes').mockResolvedValueOnce(); // Mock le chargement des communes
      service['communesIndex'] = {
        '75056': mockCommunes[2], // Paris
      };

      const result = service.getCommune('75101'); // Arrondissement de Paris
      expect(result).toEqual(mockCommunes[2]);
    });

    it('devrait retourner undefined si la commune n\'existe pas', () => {
      const result = service.getCommune('99999'); // Code inconnu
      expect(result).toBeUndefined();
    });
  });

  describe('loadCommunes', () => {
    it('devrait charger les communes depuis la base de données', async () => {
      // @ts-ignore
      jest.spyOn(communeRepository, 'find').mockResolvedValueOnce(mockCommunes);

      await service.loadCommunes();

      expect(communeRepository.find).toHaveBeenCalledWith({ where: { disabled: false } });
      expect(service['communes']).toEqual(mockCommunes);
      expect(service['communesIndex']).toEqual({
        '75001': mockCommunes[0],
        '13201': mockCommunes[1],
        '75056': mockCommunes[2],
        '13055': mockCommunes[3],
      });
    });

    it('devrait réinitialiser les données avant de charger', async () => {
      // @ts-ignore
      jest.spyOn(communeRepository, 'find').mockResolvedValueOnce(mockCommunes);

      service['communes'] = [...mockCommunes]; // Simule des communes déjà chargées
      service['communesIndex'] = { '75001': mockCommunes[0] };

      await service.loadCommunes();

      expect(service['communes']).toEqual(mockCommunes);
      expect(service['communesIndex']).toEqual({
        '75001': mockCommunes[0],
        '13201': mockCommunes[1],
        '75056': mockCommunes[2],
        '13055': mockCommunes[3],
      });
    });
  });

  describe('findArretesMunicipaux', () => {
    it('devrait retourner les arrêtés municipaux publiés', async () => {
      // @ts-ignore
      jest.spyOn(communeRepository, 'find').mockResolvedValueOnce(mockArretesMunicipaux);

      const result = await service.findArretesMunicipaux();

      expect(communeRepository.find).toHaveBeenCalledWith(expect.objectContaining({
        select: {
          code: true,
          arretesMunicipaux: {
            id: true,
            fichier: {
              url: true,
            },
          },
        },
        relations: [
          'arretesMunicipaux',
          'arretesMunicipaux.fichier',
        ],
        where: {
          arretesMunicipaux: {
            statut: 'publie',
          },
        },
      }));
      expect(result).toEqual(mockArretesMunicipaux);
    });
  });

  describe('normalizeCodeCommune', () => {
    it('devrait normaliser les codes des arrondissements de Paris', () => {
      const result = (service as any).normalizeCodeCommune('75101'); // Arrondissement de Paris
      expect(result).toBe('75056');
    });

    it('devrait normaliser les codes des arrondissements de Marseille', () => {
      const result = (service as any).normalizeCodeCommune('13201'); // Arrondissement de Marseille
      expect(result).toBe('13055');
    });

    it('devrait normaliser les codes des arrondissements de Lyon', () => {
      const result = (service as any).normalizeCodeCommune('69381'); // Arrondissement de Lyon
      expect(result).toBe('69123');
    });

    it('devrait retourner le code original si non normalisé', () => {
      const result = (service as any).normalizeCodeCommune('99999'); // Code inconnu
      expect(result).toBe('99999');
    });
  });
});