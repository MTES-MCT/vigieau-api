import { Test, TestingModule } from '@nestjs/testing';
import { MattermostService } from './mattermost.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { VigieauLogger } from '../logger/vigieau.logger';

describe('MattermostService', () => {
  let service: MattermostService;
  let httpServiceMock: Partial<HttpService>;
  let configServiceMock: Partial<ConfigService>;
  let mockLogger: Partial<VigieauLogger>;

  beforeEach(async () => {
    // Mock du HttpService
    httpServiceMock = {
      post: jest.fn().mockReturnValue(of({})), // Simule une réponse réussie
    };

    // Mock du ConfigService
    configServiceMock = {
      get: jest.fn((key: string) => {
        if (key === 'MATTERMOST_WEBHOOK_URL') {
          return 'http://mock-webhook-url'; // URL fictive pour les tests
        }
        return null;
      }),
    };

    // Mock du logger pour capturer les logs sans les afficher
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    // Création du module de test
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MattermostService,
        { provide: HttpService, useValue: httpServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    // Récupération de l'instance du service à tester
    service = <MattermostService> module.get(MattermostService);
    (service as any).logger = mockLogger;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log the message if MATTERMOST_WEBHOOK_URL is not configured', async () => {
    // Simule une URL non configurée
    // @ts-ignore
    service.webhookUrl = null;

    await service.sendMessage('Test message');

    // Vérifie que le message est loggé
    expect(mockLogger.log).toHaveBeenCalledWith('Test message');
    // Vérifie que le HttpService.post n'est pas appelé
    expect(httpServiceMock.post).not.toHaveBeenCalled();
  });

  it('should send the message if MATTERMOST_WEBHOOK_URL is configured', async () => {

    await service.sendMessage('Test message');

    // Vérifie que le HttpService.post est appelé avec l'URL et le payload corrects
    expect(httpServiceMock.post).toHaveBeenCalledWith('http://mock-webhook-url', { text: 'Test message' });
    // Vérifie que le log confirme l'envoi
    expect(mockLogger.log).not.toHaveBeenCalledWith('Test message');
  });

  it('should log an error if the HTTP request fails', async () => {
    const error = new Error('HTTP error');
    // Simule une erreur lors de l'appel HTTP
    // @ts-ignore
    jest.spyOn(httpServiceMock, 'post').mockReturnValueOnce(throwError(() => error));

    await service.sendMessage('Test message');

    // Vérifie que l'erreur est loggée
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Échec d\'envoi du message à Mattermost. Message',
      'HTTP error',
    );
  });
});