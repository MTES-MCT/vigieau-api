import { Test, TestingModule } from '@nestjs/testing';
import { CronService } from './cron.service';
import { DataSource } from 'typeorm';
import { VigieauLogger } from '../logger/vigieau.logger';

describe('CronService', () => {
  let service: CronService;
  let mockDataSource: Partial<DataSource>;
  let mockLogger: Partial<VigieauLogger>;

  beforeEach(async () => {
    // Mock du DataSource pour éviter les appels réels à la base de données
    mockDataSource = {
      query: jest.fn(),
    };

    // Mock du logger pour capturer les logs sans les afficher
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: VigieauLogger, useValue: mockLogger },
      ],
    }).compile();

    service = <CronService>module.get(CronService);
    (service as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllMocks(); // Nettoie les mocks après chaque test
  });

  describe('constructor', () => {
    it('devrait appeler freeLocks lors de l\'initialisation', async () => {
      // Crée un mock partiel pour CronService
      //@ts-ignore
      const spyFreeLocks = jest.spyOn(CronService.prototype as any, 'freeLocks').mockResolvedValueOnce(undefined);

      // Instancie le service (le constructeur appellera automatiquement freeLocks)
      const service = new CronService(mockDataSource as any);

      // Vérifie que freeLocks a été appelée
      expect(spyFreeLocks).toHaveBeenCalled();

      // Nettoie le mock pour éviter d'affecter d'autres tests
      spyFreeLocks.mockRestore();
    });
  });

  describe('freeLocks', () => {
    it('devrait libérer tous les locks définis dans cronNames', async () => {
      const lockId = 5944578563374335; // ID défini dans cronNames

      // Appelle explicitement la méthode freeLocks
      await service['freeLocks']();

      expect(mockDataSource.query).toHaveBeenCalledWith(`SELECT pg_advisory_unlock(${lockId})`);
      expect(mockLogger.log).toHaveBeenCalledWith('LIBERATION DES LOCKS CRON - BEGIN');
      expect(mockLogger.log).toHaveBeenCalledWith('LIBERATION DES LOCKS CRON - END');
    });

    it('devrait logger une erreur si la libération des locks échoue', async () => {
      // @ts-ignore
      jest.spyOn(mockDataSource, 'query').mockRejectedValueOnce(new Error('SQL Error'));

      // Appelle explicitement la méthode freeLocks
      await service['freeLocks']();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Erreur lors de la libération des locks.',
        expect.any(Error),
      );
    });
  });

  describe('askForLock', () => {
    it('devrait acquérir un lock si le nom est valide', async () => {
      const lockId = 5944578563374335; // ID défini dans cronNames
      // @ts-ignore
      jest.spyOn(mockDataSource, 'query').mockResolvedValueOnce([{ should_run: true }]);

      const result = await service.askForLock('emails');

      expect(mockDataSource.query).toHaveBeenCalledWith(
        `SELECT pg_try_advisory_lock(${lockId}) AS "should_run"`,
      );
      expect(result).toBe(true);
    });

    it('devrait retourner false si le nom est invalide', async () => {
      const result = await service.askForLock('inconnu');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Le nom du cron "inconnu" n\'existe pas dans cronNames.',
        '',
      );
    });
  });

  describe('unlock', () => {
    it('devrait libérer un lock si le nom est valide', async () => {
      const lockId = 5944578563374335; // ID défini dans cronNames

      await service.unlock('emails');

      expect(mockDataSource.query).toHaveBeenCalledWith(`SELECT pg_advisory_unlock(${lockId})`);
    });

    it('devrait retourner false si le nom est invalide', async () => {
      const result = await service.unlock('inconnu');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Le nom du cron "inconnu" n\'existe pas dans cronNames.',
        '',
      );
    });
  });
});