import { Controller, Get, Query } from '@nestjs/common';
import { DepartementsService } from './departements.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SubscriptionDto } from '../subscriptions/dto/subscription.dto';
import { DepartementDto } from './dto/departement.dto';

@Controller('departements')
export class DepartementsController {
  constructor(private readonly departementsService: DepartementsService) {}

  @Get()
  @ApiOperation({ summary: "Récupérer les niveaux de gravités maximum par département" })
  @ApiResponse({
    status: 201,
    type: DepartementDto,
  })
  async situationByDepartement(): Promise<DepartementDto[]> {
    return this.departementsService.situationByDepartement();
  }
}
