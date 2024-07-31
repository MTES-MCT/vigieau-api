import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticDepartement } from './entities/statistic_departement.entity';
import { DataController } from './data.controller';
import { DataService } from './data.service';
import { Departement } from '../zones/entities/departement.entity';
import { Region } from '../zones/entities/region.entity';
import { BassinVersant } from '../zones/entities/bassin_versant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StatisticDepartement, Departement, Region, BassinVersant])],
  controllers: [DataController],
  providers: [DataService],
})
export class DataModule {
}