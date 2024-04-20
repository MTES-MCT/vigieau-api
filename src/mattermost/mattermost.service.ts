import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class MattermostService {

  constructor(private readonly httpService: HttpService) {
  }

  sendMessage(text) {
    if (!process.env.MATTERMOST_WEBHOOK_URL) {
      return
    }

    console.log('TEXT', text);

    // return this.httpService.post(process.env.MATTERMOST_WEBHOOK_URL, {json: {text}})
  }

}