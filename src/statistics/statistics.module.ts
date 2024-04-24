import { Module } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { HttpModule } from '@nestjs/axios';
import { DepartementsModule } from '../departements/departements.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Statistic } from './entities/statistic.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Statistic]), HttpModule, DepartementsModule, SubscriptionsModule],
  controllers: [StatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {
}
