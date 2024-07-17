import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ArretesRestrictionsService } from './arretes_restrictions.service';
import { ArreteRestrictionDto } from './dto/arrete_restriction.dto';

@Controller('arretes_restrictions')
export class ArretesRestrictionsController {
  constructor(private readonly arretesRestrictionsService: ArretesRestrictionsService) {}

  @Get()
  @ApiOperation({ summary: "Récupérer les arrêtés de restrictions en vigueur par date" })
  @ApiResponse({
    status: 201,
    type: ArreteRestrictionDto,
  })
  @ApiQuery({ name: 'date', description: 'Date de recherche (YYYY-MM-DD), si non précisée c\'est la date du jour qui est prise en compte', required: false })
  async situationByDepartement(@Query('date') date?: string,): Promise<ArreteRestrictionDto[]> {
    return this.arretesRestrictionsService.getByDate(date);
  }
}