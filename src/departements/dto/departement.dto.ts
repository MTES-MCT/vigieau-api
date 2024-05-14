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
}