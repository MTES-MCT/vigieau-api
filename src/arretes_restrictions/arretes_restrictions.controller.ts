import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ArretesRestrictionsService } from './arretes_restrictions.service';
import { ArreteRestrictionDto, ArretesRestrictionsQueryDto } from './dto/arrete_restriction.dto';

@Controller('arretes_restrictions')
export class ArretesRestrictionsController {
  constructor(private readonly arretesRestrictionsService: ArretesRestrictionsService) {
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer les arrêtés de restrictions en vigueur par date' })
  @ApiResponse({
    status: 201,
    description: 'Liste des arrêtés de restrictions',
    type: ArreteRestrictionDto,
    isArray: true,
  })
  async situationByDepartement(@Query() query: ArretesRestrictionsQueryDto): Promise<ArreteRestrictionDto[]> {
    const { date, bassinVersant, region, departement } = query;
    return this.arretesRestrictionsService.getByDate(date, bassinVersant, region, departement);
  }
}