import { ApiProperty } from '@nestjs/swagger';
import { ArreteDto } from './arrete.dto';
import { UsageDto } from './usage.dto';

export class ZoneDto {
  @ApiProperty({ example: 1, description: 'Id de la zone d\'alerte' })
  id: number;

  @ApiProperty({ example: '01_ZONE_SUP', description: 'Code de la zone d\'alerte' })
  code: string;

  @ApiProperty({ example: 'Zone superficielle en aval de la rivière', description: 'Nom de la zone d\'alerte' })
  nom: string;

  @ApiProperty({
    enum: ['AEP', 'SOU', 'SUP'],
    example: 'SUP',
    description: 'Type de la zone d\'alerte (SOU / eau souterraine, SUP / eau superficielle ou AEP / eau potable)',
  })
  type: string;

  @ApiProperty({
    enum: ['vigilance', 'alerte', 'alerte_renforcee', 'crise'],
    example: 'alerte_renforcee',
    description: 'Niveau de gravité de la zone d\'alerte',
  })
  niveauGravite: string;

  @ApiProperty({ example: '01', description: 'Code du département' })
  departement: string;

  @ApiProperty()
  arrete: ArreteDto;

  @ApiProperty({ type: [UsageDto] })
  usages: UsageDto[];
}