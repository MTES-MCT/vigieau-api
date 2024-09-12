import { ApiProperty } from '@nestjs/swagger';

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