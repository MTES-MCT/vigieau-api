import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { VigieauLogger } from '../logger/vigieau.logger';

@Injectable()
export class MattermostService {
  private readonly logger = new VigieauLogger('MattermostService');

  constructor(private readonly httpService: HttpService) {
  }

  sendMessage(text) {
    if (!process.env.MATTERMOST_WEBHOOK_URL) {
      this.logger.log(text);
      return;
    }

    return this.httpService.post(process.env.MATTERMOST_WEBHOOK_URL, {json: {text}})
  }

}