import { Module } from '@nestjs/common';
import { BrevoService } from './brevo.service';
import { CommunesModule } from '../communes/communes.module';

@Module({
  imports: [
    CommunesModule
  ],
  controllers: [],
  providers: [BrevoService],
  exports: [BrevoService],
})
export class BrevoModule {}