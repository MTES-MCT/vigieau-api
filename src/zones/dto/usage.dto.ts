import { ApiProperty } from '@nestjs/swagger';

export class UsageDto {
  @ApiProperty({ example: 'Arrosage', description: "Thématique de l'usage" })
  thematique: string;

  @ApiProperty({ example: 'Arrosage des jardins', description: "Nom de l'usage" })
  nom: string;

  @ApiProperty({ example: 'Arrosage interdit de 8h à 20h.', description: "Description de la restriction" })
  description: string;

  @ApiProperty({ example: true, description: "Cette restriction concerne-t-elle les particuliers ?" })
  concerneParticulier: boolean;

  @ApiProperty({ example: true, description: "Cette restriction concerne-t-elle les entreprises ?" })
  concerneEntreprise: boolean;

  @ApiProperty({ example: true, description: "Cette restriction concerne-t-elle les collectivités ?" })
  concerneCollectivite: boolean;

  @ApiProperty({ example: false, description: "Cette restriction concerne-t-elle les exploitations agricoles ?" })
  concerneExploitation: boolean;
}