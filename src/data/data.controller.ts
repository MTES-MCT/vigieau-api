import { Controller, Get, Query } from '@nestjs/common';
import { ApiExcludeController, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DataService } from './data.service';

@Controller('data')
@ApiExcludeController()
export class DataController {
  constructor(private readonly dataService: DataService) {
  }

  @Get('')
  @ApiOperation({ summary: 'Récupérer les données de références pour les filtres (Bassins versants, Régions, Départements)' })
  refData() {
    return this.dataService.getRefData();
  }

  @Get('area')
  @ApiOperation({ summary: 'Récupérer les pourcentages de surface couvertes par des restrictions' })
  @ApiQuery({
    name: 'dateDebut',
    description: 'Date de recherche (YYYY-MM-DD), si non précisée c\'est la date du jour qui est prise en compte',
    required: false,
  })
  @ApiQuery({
    name: 'dateFin',
    description: 'Date de recherche (YYYY-MM-DD), si non précisée c\'est la date du jour qui est prise en compte',
    required: false,
  })
  @ApiQuery({
    name: 'bassinVersant',
    description: 'Bassin versant, si non précisée c\'est tout le territoire français qui est pris en compte',
    required: false,
  })
  @ApiQuery({
    name: 'region',
    description: 'Région, si non précisée c\'est tout le territoire français qui est pris en compte',
    required: false,
  })
  @ApiQuery({
    name: 'departement',
    description: 'Departement, si non précisée c\'est tout le territoire français qui est pris en compte',
    required: false,
  })
  area(@Query('dateDebut') dateDebut?: string,
       @Query('dateFin') dateFin?: string,
       @Query('bassinVersant') bassinVersant?: string,
       @Query('region') region?: string,
       @Query('departement') departement?: string) {
    return this.dataService.areaFindByDate(dateDebut, dateFin, bassinVersant, region, departement);
  }

  @Get('departement')
  @ApiOperation({ summary: 'Récupérer les départements soumis à restriction' })
  @ApiQuery({
    name: 'dateDebut',
    description: 'Date de recherche (YYYY-MM-DD), si non précisée c\'est la date du jour qui est prise en compte',
    required: false,
  })
  @ApiQuery({
    name: 'dateFin',
    description: 'Date de recherche (YYYY-MM-DD), si non précisée c\'est la date du jour qui est prise en compte',
    required: false,
  })
  @ApiQuery({
    name: 'bassinVersant',
    description: 'Bassin versant, si non précisée c\'est tout le territoire français qui est pris en compte',
    required: false,
  })
  @ApiQuery({
    name: 'region',
    description: 'Région, si non précisée c\'est tout le territoire français qui est pris en compte',
    required: false,
  })
  @ApiQuery({
    name: 'departement',
    description: 'Departement, si non précisée c\'est tout le territoire français qui est pris en compte',
    required: false,
  })
  departement(@Query('dateDebut') dateDebut?: string,
              @Query('dateFin') dateFin?: string,
              @Query('bassinVersant') bassinVersant?: string,
              @Query('region') region?: string,
              @Query('departement') departement?: string) {
    return this.dataService.departementFindByDate(dateDebut, dateFin, bassinVersant, region, departement);
  }
}
