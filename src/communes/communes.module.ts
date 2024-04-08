import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunesService } from './communes.service';
import { Commune } from '../zones/entities/commune.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Commune]),
  ],
  controllers: [],
  providers: [CommunesService],
  exports: [CommunesService],
})
export class CommunesModule {}
