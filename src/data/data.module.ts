import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticDepartement } from './entities/statistic_departement.entity';
import { DataController } from './data.controller';
import { DataService } from './data.service';
import { Departement } from '../zones/entities/departement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StatisticDepartement, Departement])],
  controllers: [DataController],
  providers: [DataService],
})
export class DataModule {
}