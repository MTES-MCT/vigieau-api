import { ApiProperty } from '@nestjs/swagger';

export class ArreteDto {
  @ApiProperty({ example: 1, description: "Id de l'arrêté de restriction" })
  id: number;

  @ApiProperty({ example: '01/01/2024', description: "Date d'entrée en vigueur de l'arrêté de restriction" })
  dateDebutValidite: Date;

  @ApiProperty({ example: '31/12/2024', description: "Date d'abrogation de l'arrêté de restriction" })
  dateFinValidite: Date;

  @ApiProperty({ example: 'https://example.com/arrete.pdf', description: "Lien du PDF de l'arrêté de restriction" })
  cheminFichier: string;

  @ApiProperty({ example: 'https://example.com/arrete_cadre.pdf', description: "Lien du PDF de l'arrêté cadre" })
  cheminFichierArreteCadre: string;
}