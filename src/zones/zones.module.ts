import { Module } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { ZonesController } from './zones.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
 import { Restriction } from './entities/restriction.entity';
import { Usage } from './entities/usage.entity';
import { Thematique } from './entities/thematique.entity';
import { ArreteCadre } from './entities/arrete_cadre.entity';
import { Fichier } from './entities/fichier.entity';
import { ZoneAlerteComputed } from './entities/zone_alerte_computed.entity';
import { DepartementsModule } from '../departements/departements.module';
import { DataModule } from '../data/data.module';
import { StatisticsModule } from '../statistics/statistics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ZoneAlerteComputed, Restriction, Usage, Thematique, ArreteCadre, Fichier]),
    DepartementsModule,
    DataModule,
    StatisticsModule
  ],
  controllers: [ZonesController],
  providers: [ZonesService],
  exports: [ZonesService],
})
export class ZonesModule {
}
