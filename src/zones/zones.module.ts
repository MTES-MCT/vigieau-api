import { Module } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { ZonesController } from './zones.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Commune } from './entities/commune.entity';
import { Restriction } from './entities/restriction.entity';
import { Usage } from './entities/usage.entity';
import { Thematique } from './entities/thematique.entity';
import { ArreteRestriction } from './entities/arrete_restriction.entity';
import { ArreteCadre } from './entities/arrete_cadre.entity';
import { Fichier } from './entities/fichier.entity';
import { ZoneAlerteComputed } from './entities/zone_alerte_computed.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ZoneAlerteComputed, Commune, Restriction, Usage, Thematique, ArreteRestriction, ArreteCadre, Fichier]),
  ],
  controllers: [ZonesController],
  providers: [ZonesService],
})
export class ZonesModule {
}
