import { Module } from '@nestjs/common';
import { VigieauLogger } from './vigieau.logger';

@Module({
  providers: [VigieauLogger],
  exports: [VigieauLogger],
})
export class LoggerModule {}
