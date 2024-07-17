import { ApiProperty } from '@nestjs/swagger';
import { DepartementDto } from '../../departements/dto/departement.dto';

class FichierDto {
  @ApiProperty({ example: 'fichier.pdf', description: `Nom du fichier` })
  nom: string;

  @ApiProperty({ example: 'https://vigieau.gouv.fr/fichier.pdf', description: `URL du fichier` })
  url: string;

  @ApiProperty({ example: 1024, description: `Taille du fichier en octets` })
  size: number;
}

export class ArreteRestrictionDto {
  @ApiProperty({ example: 1, description: `Identifiant BDD de l'arrêté de restriction` })
  id: string;

  @ApiProperty({ example: '01', description: `Numéro de l'arrêté de restriction` })
  numero: string;

  @ApiProperty({ example: '01/01/2024', description: 'Date d\'entrée en vigueur de l\'arrêté de restriction' })
  dateDebut: Date;

  @ApiProperty({ example: '31/12/2024', description: 'Date d\'abrogation de l\'arrêté de restriction' })
  dateFin: Date;

  @ApiProperty({ example: '01/01/2024', description: 'Date de signature de l\'arrêté de restriction' })
  dateSignature: Date;

  @ApiProperty()
  departement: DepartementDto;

  @ApiProperty()
  fichier: FichierDto;

  @ApiProperty({ example: 'ESO, ESU, AEP', description: `Types d'eaux concernées par l'arrêté de restriction` })
  types: string[];

  @ApiProperty({
    enum: ['vigilance', 'alerte', 'alerte_renforcee', 'crise'],
    example: 'alerte_renforcee',
    description: 'Niveau de gravité maximum en vigueur sur le département, null si pas de zone d\'alerte en vigueur',
  })
  niveauGraviteMax: string;
}