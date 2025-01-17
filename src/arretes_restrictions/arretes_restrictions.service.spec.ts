import { Test, TestingModule } from '@nestjs/testing';
import { ArretesRestrictionsService } from './arretes_restrictions.service';
import { IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ArreteRestriction } from '../zones/entities/arrete_restriction.entity';
import { VigieauLogger } from '../logger/vigieau.logger';

describe('ArretesRestrictionsService', () => {
  let service: ArretesRestrictionsService;
  let repository: Repository<ArreteRestriction>;

  const mockArreteRestrictions = [
    {
      id: 1,
      numero: '01',
      dateDebut: '2024-01-01',
      dateFin: '2024-12-31',
      dateSignature: '2024-01-01',
      statut: 'publie',
      departement: { code: '75', nom: 'Paris' },
      fichier: { nom: 'fichier.pdf', url: 'http://example.com/fichier.pdf', size: 1024 },
      restrictions: [
        { niveauGravite: 'alerte', zonesAlerteComputed: [{ type: 'ESO' }] },
        { niveauGravite: 'vigilance', zonesAlerteComputed: [{ type: 'ESU' }] },
      ],
    },
    {
      id: 2,
      numero: '02',
      dateDebut: '2024-02-01',
      dateFin: null,
      dateSignature: '2024-02-01',
      statut: 'publie',
      departement: { code: '33', nom: 'Gironde' },
      fichier: { nom: 'arrete.pdf', url: 'http://example.com/arrete.pdf', size: 2048 },
      restrictions: [
        { niveauGravite: 'crise', zonesAlerteComputed: [{ type: 'AEP' }] },
      ],
    },
  ];

  const mockRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArretesRestrictionsService,
        VigieauLogger,
        {
          provide: getRepositoryToken(ArreteRestriction),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = <ArretesRestrictionsService>module.get(ArretesRestrictionsService);
    repository = <Repository<ArreteRestriction>>module.get(getRepositoryToken(ArreteRestriction));
  });

  afterEach(() => {
    jest.clearAllMocks(); // Réinitialise les appels à toutes les fonctions mockées
  });

  it('devrait être défini', () => {
    expect(service).toBeDefined();
  });

  describe('getByDate', () => {
    it('devrait retourner les arrêtés enrichis avec niveauGraviteMax et types (cas nominal)', async () => {
      mockRepository.find.mockResolvedValue(mockArreteRestrictions);

      const result = await service.getByDate('2024-01-15');
      expect(repository.find).toHaveBeenCalledWith(expect.any(Object));
      expect(result).toHaveLength(2);

      // Vérifie l'enrichissement des données
      expect(result[0].niveauGraviteMax).toBe('alerte');
      expect(result[0].types).toEqual(['ESO', 'ESU']);
      expect(result[1].niveauGraviteMax).toBe('crise');
      expect(result[1].types).toEqual(['AEP']);
    });

    it('devrait filtrer les arrêtés en fonction de la date', async () => {
      mockRepository.find.mockResolvedValue([mockArreteRestrictions[0]]);

      const result = await service.getByDate('2024-01-01');
      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            // Première condition : arrêtés avec une date de fin >= date
            expect.objectContaining({
              dateDebut: LessThanOrEqual('2024-01-01'),
              dateFin: MoreThanOrEqual('2024-01-01'),
            }),
            // Deuxième condition : arrêtés avec une date de fin NULL
            expect.objectContaining({
              dateDebut: LessThanOrEqual('2024-01-01'),
              dateFin: IsNull(),
            }),
          ]),
        }),
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('devrait retourner un tableau vide si aucun arrêté ne correspond', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getByDate('2030-01-01');
      expect(repository.find).toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });

    it('devrait gérer un bassin versant dans les filtres', async () => {
      mockRepository.find.mockResolvedValue([mockArreteRestrictions[1]]);

      const result = await service.getByDate('2024-01-15', 'bassin123');
      expect(repository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            expect.objectContaining({
              departement: { bassinsVersants: { id: 'bassin123' } },
            }),
          ]),
        }),
      );

      expect(result).toHaveLength(1);
      expect(result[0].departement.code).toBe('33');
    });

    it('devrait lancer une erreur en cas de problème dans la base de données', async () => {
      mockRepository.find.mockRejectedValue(new Error('Erreur BDD'));

      await expect(service.getByDate('2024-01-15')).rejects.toThrow('Erreur BDD');
      expect(repository.find).toHaveBeenCalled();
    });

    it('devrait gérer les cas où les relations manquent', async () => {
      mockRepository.find.mockResolvedValue([
        {
          id: 3,
          numero: '03',
          dateDebut: '2024-03-01',
          dateFin: null,
          statut: 'publie',
          departement: null, // Pas de département
          fichier: null, // Pas de fichier
          restrictions: [],
        },
      ]);

      const result = await service.getByDate('2024-03-01');
      expect(result).toHaveLength(1);
      expect(result[0].niveauGraviteMax).toBeNull();
      expect(result[0].types).toEqual([]);
    });
  });
});