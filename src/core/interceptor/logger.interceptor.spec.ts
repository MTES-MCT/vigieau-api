import { LoggerInterceptor } from './logger.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { VigieauLogger } from '../../logger/vigieau.logger';

describe('LoggerInterceptor', () => {
  let interceptor: LoggerInterceptor;
  let mockLogger: Partial<VigieauLogger>;
  let mockContext: Partial<ExecutionContext>;
  let mockHandler: Partial<CallHandler>;

  beforeEach(() => {
    // Mock de l'intercepteur avec un logger mocké
    interceptor = new LoggerInterceptor();

    // Mock du logger
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
    };

    // Remplace le logger interne par un mock
    (interceptor as any)._logger = mockLogger;

    // Mock du contexte d'exécution (ExecutionContext)
    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          ip: '127.0.0.1',
          method: 'GET',
          originalUrl: '/api/test',
          body: { key: 'value' },
          headers: { 'user-agent': 'TestAgent', host: 'localhost:3000' },
          session: { user: { email: 'test@example.com' } },
        }),
      }),
    };

    // Mock du gestionnaire de réponse (CallHandler)
    mockHandler = {
      handle: jest.fn(() => of('response')), // Simule une réponse réussie
    };
  });

  afterEach(() => {
    jest.clearAllMocks(); // Nettoie tous les mocks après chaque test
  });

  describe('intercept', () => {
    it('devrait logger la requête entrante et la réponse sortante', async () => {
      const requestId = expect.any(String); // On ne connaît pas l'UUID exact
      const mockRequest = mockContext.switchToHttp().getRequest();

      await lastValueFrom(interceptor.intercept(
        mockContext as ExecutionContext,
        mockHandler as CallHandler)); // Convertit l'observable en promesse pour attendre sa résolution

      // Vérifie le log de la requête
      expect(mockLogger.log).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('REQUEST - ID: '), // On ignore l'ID exact
      );
      expect(mockLogger.log).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining(`IP: ${mockRequest.ip}`),
      );
      expect(mockLogger.log).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining(`User: test@example.com`),
      );
      expect(mockLogger.log).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining(`Method: ${mockRequest.method}`),
      );
      expect(mockLogger.log).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining(`URL: ${mockRequest.originalUrl}`),
      );
      expect(mockLogger.log).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining(`Body: ${JSON.stringify(mockRequest.body)}`),
      );

      // Vérifie le log de la réponse
      expect(mockLogger.log).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('RESPONSE - ID: '), // On ignore l'ID exact
      );
      expect(mockLogger.log).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining(`URL: ${mockRequest.originalUrl}`),
      );
      expect(mockLogger.log).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining(`User: test@example.com`),
      );
    });

    it('devrait gérer l’absence de session ou d’utilisateur', async () => {
      // Modifie le mock pour simuler une requête sans session
      mockContext.switchToHttp().getRequest = jest.fn().mockReturnValue({
        ip: '127.0.0.1',
        method: 'POST',
        originalUrl: '/api/test',
        body: { key: 'value' },
        headers: { 'user-agent': 'TestAgent', host: 'localhost:3000' },
      });

      await interceptor.intercept(
        mockContext as ExecutionContext,
        mockHandler as CallHandler,
      ).toPromise();

      // Vérifie que le log de la requête est correctement formé même sans session
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('User: Anonymous'), // Devrait afficher "Anonymous" si aucun utilisateur
      );
    });

    it('devrait gérer l’absence de corps dans la requête', async () => {
      // Modifie le mock pour simuler une requête sans corps
      mockContext.switchToHttp().getRequest = jest.fn().mockReturnValue({
        ip: '127.0.0.1',
        method: 'PUT',
        originalUrl: '/api/no-body',
        body: undefined, // Pas de corps
        headers: { 'user-agent': 'TestAgent', host: 'localhost:3000' },
        session: { user: { email: 'test@example.com' } },
      });

      await interceptor.intercept(
        mockContext as ExecutionContext,
        mockHandler as CallHandler,
      ).toPromise();

      // Vérifie que le log de la requête est correctement formé
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Body: {}'), // Le corps devrait être vide
      );
    });
  });
});