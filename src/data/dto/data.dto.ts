import { IsOptional, IsString, IsDateString } from 'class-validator';

export class CommonDataQueryDto {
  @IsOptional()
  @IsDateString({}, { message: 'dateDebut doit être une date valide au format YYYY-MM-DD' })
  dateDebut?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dateFin doit être une date valide au format YYYY-MM-DD' })
  dateFin?: string;

  @IsOptional()
  @IsString({ message: 'bassinVersant doit être une chaîne de caractères' })
  bassinVersant?: string;

  @IsOptional()
  @IsString({ message: 'region doit être une chaîne de caractères' })
  region?: string;

  @IsOptional()
  @IsString({ message: 'departement doit être une chaîne de caractères' })
  departement?: string;
}

export class CommuneQueryDto {
  @IsOptional()
  @IsString({ message: 'dateDebut doit être une date valide au format YYYY-MM' })
  dateDebut?: string;

  @IsOptional()
  @IsString({ message: 'dateFin doit être une date valide au format YYYY-MM' })
  dateFin?: string;
}