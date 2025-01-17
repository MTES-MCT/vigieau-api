import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { VigieauLogger } from '../../logger/vigieau.logger';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  private readonly _logger = new VigieauLogger('LoggerInterceptor');

  /**
   * Intercepte les requêtes entrantes et leurs réponses pour les logger.
   *
   * @param context Le contexte d'exécution de la requête (NestJS).
   * @param next La chaîne de traitement suivante.
   * @returns Un Observable qui permet de continuer le traitement et de logger la réponse.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const requestId = randomUUID();
    const req = context.switchToHttp().getRequest();
    const { ip, method, originalUrl, body, headers, session } = req;

    // Formate les informations utilisateur et session
    const userEmail = session?.user?.email || 'Anonymous';
    const userAgent = headers['user-agent'] || 'Unknown';
    const hostname = headers.host || 'Unknown Host';

    // Log la requête entrante
    this._logger.log(
      `REQUEST - ID: ${requestId}, IP: ${ip}, User: ${userEmail}, Method: ${method}, URL: ${originalUrl}, Host: ${hostname}, UserAgent: ${userAgent}, Body: ${JSON.stringify(
        body || {},
      )}`,
    );

    // Intercepte et log la réponse
    return next.handle().pipe(
      tap(() => {
        this._logger.log(`RESPONSE - ID: ${requestId}, URL: ${originalUrl}, User: ${userEmail}`);
      }),
    );
  }
}
