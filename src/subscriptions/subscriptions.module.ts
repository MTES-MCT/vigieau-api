import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { CommunesModule } from '../communes/communes.module';
import { HttpModule } from '@nestjs/axios';
import { ZonesModule } from '../zones/zones.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbonnementMail } from '../zones/entities/abonnement_mail.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AbonnementMail]),
    CommunesModule,
    HttpModule,
    ZonesModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
})
export class SubscriptionsModule {
}
