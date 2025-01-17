import { applyDecorators, Controller, Get, Param, Query } from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DataService } from './data.service';
import { CommonDataQueryDto, CommuneQueryDto } from './dto/data.dto';

// Constantes pour éviter la répétition des décorateurs `@ApiQuery`
function CommonApiQueries(): MethodDecorator {
  return applyDecorators(
    ApiQuery({
      name: 'dateDebut',
      description: 'Date de recherche (YYYY-MM-DD), si non précisée, c\'est la date du jour qui est prise en compte',
      required: false,
    }),
    ApiQuery({
      name: 'dateFin',
      description: 'Date de recherche (YYYY-MM-DD), si non précisée, c\'est la date du jour qui est prise en compte',
      required: false,
    }),
    ApiQuery({
      name: 'bassinVersant',
      description: 'Bassin versant, si non précisé, c\'est tout le territoire français qui est pris en compte',
      required: false,
    }),
    ApiQuery({
      name: 'region',
      description: 'Région, si non précisée, c\'est tout le territoire français qui est pris en compte',
      required: false,
    }),
    ApiQuery({
      name: 'departement',
      description: 'Département, si non précisé, c\'est tout le territoire français qui est pris en compte',
      required: false,
    }),
  );
};

@Controller('data')
@ApiExcludeController()
export class DataController {
  constructor(private readonly dataService: DataService) {
  }

  @Get('')
  @ApiOperation({ summary: 'Récupérer les données de références pour les filtres (Bassins versants, Régions, Départements)' })
  refData(): any {
    return this.dataService.getRefData();
  }

  @Get('area')
  @ApiOperation({ summary: 'Récupérer les pourcentages de surface couvertes par des restrictions' })
  @CommonApiQueries()
  area(@Query() query: CommonDataQueryDto): any[] {
    return this.dataService.areaFindByDate(
      query.dateDebut,
      query.dateFin,
      query.bassinVersant,
      query.region,
      query.departement,
    );
  }

  @Get('departement')
  @ApiOperation({ summary: 'Récupérer les départements soumis à restriction' })
  @CommonApiQueries()
  departement(@Query() query: CommonDataQueryDto): any[] {
    return this.dataService.departementFindByDate(
      query.dateDebut,
      query.dateFin,
      query.bassinVersant,
      query.region,
      query.departement,
    );
  }

  @Get('duree')
  @ApiOperation({ summary: 'Récupérer la pondération par commune concernée par des restrictions' })
  duree(): any[] {
    return this.dataService.duree();
  }

  @Get('commune/:codeInsee')
  @ApiOperation({ summary: 'Récupérer les stats journalières d\'une commune' })
  @ApiQuery({
    name: 'dateDebut',
    description: 'Date de recherche (YYYY-MM), si non précisée c\'est la date du jour qui est prise en compte',
    required: false,
  })
  @ApiQuery({
    name: 'dateFin',
    description: 'Date de recherche (YYYY-MM), si non précisée c\'est la date du jour qui est prise en compte',
    required: false,
  })
  commune(@Param('codeInsee') codeInsee: string,
          @Query() query: CommuneQueryDto,
  ): Promise<any> {
    return this.dataService.commune(codeInsee, query.dateDebut, query.dateFin);
  }
}
