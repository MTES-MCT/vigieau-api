import { Controller, Get, Query } from '@nestjs/common';
import { DepartementsService } from './departements.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DepartementDto, QueryDepartementDto } from './dto/departement.dto';

@Controller('departements')
export class DepartementsController {
  constructor(private readonly departementsService: DepartementsService) {
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer les niveaux de gravités maximum par département' })
  @ApiResponse({
    status: 201,
    type: DepartementDto,
    isArray: true,
  })
  async situationByDepartement(@Query() query: QueryDepartementDto): Promise<DepartementDto[]> {
    return this.departementsService.situationByDepartement(query.date, query.bassinVersant, query.region, query.departement);
  }
}
