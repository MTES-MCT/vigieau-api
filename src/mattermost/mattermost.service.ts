import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { VigieauLogger } from '../logger/vigieau.logger';
import { catchError, lastValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MattermostService {
  private readonly logger = new VigieauLogger('MattermostService');
  private readonly webhookUrl: string;

  constructor(private readonly httpService: HttpService,
              private readonly configService: ConfigService) {
    this.webhookUrl = this.configService.get<string>('MATTERMOST_WEBHOOK_URL');
  }

  /**
   * Envoie un message à Mattermost via un webhook ou log le message si aucun webhook n'est configuré.
   *
   * @param text - Le texte du message à envoyer.
   * @returns Une promesse résolue ou rejetée selon le succès de l'envoi du message.
   */
  async sendMessage(text: string) {
    if (!this.webhookUrl) {
      this.logger.log(text);
      return;
    }

    try {
      // Envoi du message au webhook Mattermost.
      await lastValueFrom(
        this.httpService.post(this.webhookUrl, { text }),
      );
    } catch (error) {
      this.logger.error(`Échec d'envoi du message à Mattermost. Message`, error.message);
    }
  }

}