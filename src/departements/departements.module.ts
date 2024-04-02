import { Module } from '@nestjs/common';
import { DepartementsService } from './departements.service';
import { DepartementsController } from './departements.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Departement } from '../zones/entities/departement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Departement]),
  ],
  controllers: [DepartementsController],
  providers: [DepartementsService],
  exports: [DepartementsService],
})
export class DepartementsModule {}
