import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArreteRestriction } from '../zones/entities/arrete_restriction.entity';
import { ArretesRestrictionsController } from './arretes_restrictions.controller';
import { ArretesRestrictionsService } from './arretes_restrictions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ArreteRestriction]),
  ],
  controllers: [ArretesRestrictionsController],
  providers: [ArretesRestrictionsService],
  exports: [ArretesRestrictionsService],
})
export class ArretesRestrictionsModule {}