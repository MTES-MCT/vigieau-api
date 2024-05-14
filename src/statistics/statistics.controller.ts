import { Controller, Get } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller('statistics')
@ApiExcludeController()
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get()
  findAll() {
    return this.statisticsService.findAll();
  }
}
