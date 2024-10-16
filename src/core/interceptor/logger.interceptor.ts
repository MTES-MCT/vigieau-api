import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { VigieauLogger } from '../../logger/vigieau.logger';
const crypto = require('crypto');

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  private readonly _logger = new VigieauLogger('LoggerInterceptor');

  /**
   * Mise en forme des Logs de l'application
   * @param context
   * @param next
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const id = crypto.randomBytes(8).toString('hex');
    const req = context.switchToHttp().getRequest();
    const body = { ...req.body };
    this._logger.log(
      `REQUEST - ${id} - ${req.ip} - ${req.session?.user?.email} - ${
        req.method
      } - ${req.originalUrl} - ${!body ? '' : JSON.stringify(body)}`,
    );

    return next.handle().pipe(
      tap(() => {
        this._logger.log(`RESPONSE - ${id}`);
      }),
    );
  }
}
