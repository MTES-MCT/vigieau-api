import { Module } from '@nestjs/common';
import { MattermostService } from './mattermost.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [],
  providers: [MattermostService],
  exports: [MattermostService],
})
export class MattermostModule {}