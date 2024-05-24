import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { VigieauLogger } from '../logger/vigieau.logger';
import { firstValueFrom, lastValueFrom, map } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class MattermostService {
  private readonly logger = new VigieauLogger('MattermostService');

  constructor(private readonly httpService: HttpService) {
  }

  async sendMessage(text: string) {
    if (!process.env.MATTERMOST_WEBHOOK_URL) {
      this.logger.log(text);
      return;
    }

    return lastValueFrom(this.httpService.post(process.env.MATTERMOST_WEBHOOK_URL, {
      text: text
    }));
  }

}