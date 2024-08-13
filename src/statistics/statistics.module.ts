import { forwardRef, Module } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { HttpModule } from '@nestjs/axios';
import { DepartementsModule } from '../departements/departements.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Statistic } from './entities/statistic.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Statistic]),
    HttpModule,
    DepartementsModule,
    forwardRef(() => SubscriptionsModule),
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {
}
