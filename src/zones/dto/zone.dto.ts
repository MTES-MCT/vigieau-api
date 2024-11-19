import { ApiProperty } from '@nestjs/swagger';
import { ArreteDto } from './arrete.dto';
import { UsageDto } from './usage.dto';

export class ZoneDto {
  @ApiProperty({ example: 1, description: 'Id de la zone d\'alerte' })
  id: number;

  @ApiProperty({ example: 1, description: 'Id SANDRE de la zone d\'alerte' })
  idSandre: number;

  @ApiProperty({ example: 1, description: 'Id SANDRE de la zone d\'alerte - ISO SANDRE' })
  gid: number;

  @ApiProperty({ example: '01_ZONE_SUP', description: 'Code de la zone d\'alerte' })
  code: string;

  @ApiProperty({ example: '01_ZONE_SUP', description: 'Code de la zone d\'alerte - ISO SANDRE' })
  CdZAS: string;

  @ApiProperty({ example: 'Zone superficielle en aval de la rivière', description: 'Nom de la zone d\'alerte' })
  nom: string;

  @ApiProperty({ example: 'Zone superficielle en aval de la rivière', description: 'Nom de la zone d\'alerte - ISO SANDRE' })
  LbZAS: string;

  @ApiProperty({
    enum: ['AEP', 'SOU', 'SUP'],
    example: 'SUP',
    description: 'Type de la zone d\'alerte (SOU / eau souterraine, SUP / eau superficielle ou AEP / eau potable)',
  })
  type: string;

  @ApiProperty({
    enum: ['AEP', 'SOU', 'SUP'],
    example: 'SUP',
    description: 'Type de la zone d\'alerte (SOU / eau souterraine, SUP / eau superficielle ou AEP / eau potable) - ISO SANDRE',
  })
  TypeZAS: string;

  @ApiProperty({ example: true, description: "Cette ressource naturelle est-elle influencée / stockée ?" })
  ressourceInfluencee: boolean;

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

  @ApiProperty({ example: 'https://example.com/arrete.pdf', description: "Lien du PDF de l'arrêté municipal" })
  arreteMunicipalCheminFichier: string;

  @ApiProperty({ type: [UsageDto] })
  usages: UsageDto[];
}