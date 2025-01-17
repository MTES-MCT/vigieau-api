import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BrevoService } from './brevo.service';
import { CommunesService } from '../communes/communes.service';
import * as Brevo from '@getbrevo/brevo';

// Mock de Brevo local à ce fichier de test
const mockTransactionalEmailsApi = {
  authentications: { apiKey: { apiKey: '' } },
  sendTransacEmail: jest.fn(), // Mock de la méthode `sendTransacEmail`
};

// Mock de SendSmtpEmail
const mockSendSmtpEmail = jest.fn();

jest.mock('@getbrevo/brevo', () => ({
  TransactionalEmailsApi: jest.fn(() => mockTransactionalEmailsApi),
  SendSmtpEmail:jest.fn(() => mockSendSmtpEmail),
}));

describe('BrevoService', () => {
  let service: BrevoService;
  let configService: ConfigService;
  let jwtService: JwtService;
  let apiInstanceMock: any;

  beforeEach(async () => {
    // Mock de l'API Brevo
    apiInstanceMock = mockTransactionalEmailsApi;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrevoService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const envVars = {
                BREVO_API_KEY: 'test-api-key',
                EMAIL_NOTIFICATIONS_ENABLED: '1',
                EMAIL_NOTIFICATIONS_DEV_RECIPIENT: 'dev@example.com',
                WEBSITE_URL: 'https://example.com',
                JWT_SECRET: 'jwt-secret-key',
              };
              return envVars[key];
            }),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn((payload: any) => `signed-token-for-${payload.email}`), // Simule la génération d'un token JWT
          },
        },
        {
          provide: CommunesService,
          useValue: {
            getCommune: jest.fn((codeCommune: any) => ({ nom: `Commune-${codeCommune}` })), // Simule le service des communes
          },
        },
      ],
    }).compile();

    service = <BrevoService> module.get(BrevoService);
    configService = <ConfigService> module.get(ConfigService);
    jwtService = <JwtService> module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Réinitialise les mocks après chaque test
  });

  describe('Initialisation', () => {
    it('devrait initialiser le service avec la clé API Brevo', () => {
      expect(apiInstanceMock.authentications.apiKey.apiKey).toBe('test-api-key');
    });
  });

  describe('sendSituationUpdate', () => {
    it('devrait envoyer un email avec les bons paramètres', async () => {
      const email = 'user@example.com';
      const params = {
        niveauGraviteAep: 'alerte',
        changementAep: true,
        niveauGraviteSup: 'pas_restriction',
        changementSup: false,
        niveauGraviteSou: 'vigilance',
        changementSou: true,
        codeCommune: '75001',
        libelleLocalisation: 'Rue de Rivoli, Paris',
        profil: 'user_profile',
      };

      // @ts-ignore
      jest.spyOn(service, 'sendMail').mockResolvedValueOnce('Email sent');

      const result = await service.sendSituationUpdate(
        email,
        params.niveauGraviteAep,
        params.changementAep,
        params.niveauGraviteSup,
        params.changementSup,
        params.niveauGraviteSou,
        params.changementSou,
        params.codeCommune,
        params.libelleLocalisation,
        params.profil,
      );

      expect(service.sendMail).toHaveBeenCalledWith(
        65, // Template ID attendu
        'dev@example.com', // Email de développement
        expect.objectContaining({
          address: 'Rue de Rivoli, Paris',
          city: 'Commune-75001',
          unsubscribeUrl: 'https://example.com/abonnements?token=signed-token-for-user@example.com',
        }),
      );
      expect(result).toBe('Email sent');
    });

    it('ne devrait pas envoyer d’email si les notifications sont désactivées', async () => {
      // @ts-ignore
      jest.spyOn(configService, 'get').mockImplementation((key) => {
        if (key === 'EMAIL_NOTIFICATIONS_ENABLED') return '0'; // Désactive les notifications
        return 'some-value';
      });

      const result = await service.sendSituationUpdate(
        'user@example.com',
        'alerte',
        true,
        'pas_restriction',
        false,
        'vigilance',
        true,
        '75001',
        'Rue de Rivoli, Paris',
        'user_profile',
      );

      expect(result).toBeUndefined();
      expect(apiInstanceMock.sendTransacEmail).not.toHaveBeenCalled();
    });
  });

  describe('computeUnsubscribeUrl', () => {
    it('devrait générer une URL de désinscription avec un token valide', () => {
      const result = service.computeUnsubscribeUrl('user@example.com');

      expect(jwtService.sign).toHaveBeenCalledWith(
        { email: 'user@example.com' },
        {
          secret: 'jwt-secret-key',
          expiresIn: '7d',
        },
      );

      expect(result).toBe('https://example.com/abonnements?token=signed-token-for-user@example.com');
    });
  });

  describe('sendMail', () => {
    it('devrait envoyer un email via Brevo', async () => {
      apiInstanceMock.sendTransacEmail.mockResolvedValueOnce({ messageId: '12345' });

      const result = await service['sendMail'](65, 'user@example.com', { param1: 'value1' });

      expect(apiInstanceMock.sendTransacEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 65,
          to: [{ email: 'user@example.com' }],
          params: { param1: 'value1' },
        }),
      );
      expect(result).toEqual({ messageId: '12345' });
    });

    it('devrait gérer les erreurs lors de l’envoi d’email', async () => {
      apiInstanceMock.sendTransacEmail.mockRejectedValueOnce(new Error('API Error'));

      await expect(service['sendMail'](65, 'user@example.com', { param1: 'value1' })).rejects.toThrow('API Error');
    });
  });
});