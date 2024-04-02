import { Controller, Get, Query } from '@nestjs/common';
import { DepartementsService } from './departements.service';

@Controller('departements')
export class DepartementsController {
  constructor(private readonly departementsService: DepartementsService) {}

  @Get()
  async situationByDepartement(): Promise<any> {
    return this.departementsService.situationByDepartement();
  }
}
