import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class DepartementDto {
  @ApiProperty({ example: '01', description: 'Code du département' })
  code: string;

  @ApiProperty({ example: 'Ain', description: 'Nom du département' })
  nom: string;

  @ApiProperty({ example: 'Rhône-Alpes', description: 'Nom de la région' })
  region: string;

  @ApiProperty({
    enum: ['vigilance', 'alerte', 'alerte_renforcee', 'crise'],
    example: 'alerte_renforcee',
    description: 'Niveau de gravité maximum en vigueur sur le département, null si pas de zone d\'alerte en vigueur',
  })
  niveauGraviteMax: string;

  @ApiProperty({
    enum: ['vigilance', 'alerte', 'alerte_renforcee', 'crise'],
    example: 'alerte_renforcee',
    description: 'Niveau de gravité maximum en vigueur sur le département pour les eaux de type superficielle, null si pas de zone d\'alerte en vigueur',
  })
  niveauGraviteSupMax: string;

  @ApiProperty({
    enum: ['vigilance', 'alerte', 'alerte_renforcee', 'crise'],
    example: 'alerte_renforcee',
    description: 'Niveau de gravité maximum en vigueur sur le département pour les eaux de type souterraine, null si pas de zone d\'alerte en vigueur',
  })
  niveauGraviteSouMax: string;

  @ApiProperty({
    enum: ['vigilance', 'alerte', 'alerte_renforcee', 'crise'],
    example: 'alerte_renforcee',
    description: 'Niveau de gravité maximum en vigueur sur le département pour les eaux potable, null si pas de zone d\'alerte en vigueur. Donnée disponible à partir du 28/04/2024.',
  })
  niveauGraviteAepMax: string;
}

export class QueryDepartementDto {
  @ApiProperty({
    description: 'Date de recherche (format YYYY-MM-DD). Si non précisée, la date du jour sera utilisée.',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'La date doit être au format YYYY-MM-DD.' })
  date?: string;

  @ApiProperty({
    description: 'Bassin versant. Si non précisé, tout le territoire français sera pris en compte.',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Le bassin versant doit être une chaîne de caractères.' })
  bassinVersant?: string;

  @ApiProperty({
    description: 'Région. Si non précisée, tout le territoire français sera pris en compte.',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La région doit être une chaîne de caractères.' })
  region?: string;

  @ApiProperty({
    description: 'Département. Si non précisé, tout le territoire français sera pris en compte.',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Le département doit être une chaîne de caractères.' })
  departement?: string;
}