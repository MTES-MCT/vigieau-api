import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty, IsNumber, IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({
    example: 'test@exemple.com',
    description: 'Email de l\'utilisateur',
  })
  email: string;

  @IsString()
  @IsIn(['particulier', 'entreprise', 'collectivite', 'exploitation'])
  @IsNotEmpty()
  @ApiProperty({
    example: 'particulier',
    enum: ['particulier', 'entreprise', 'collectivite', 'exploitation'],
    description: 'Rôle de l\'utilisateur',
  })
  profil: string;

  @IsArray()
  @IsString({ each: true })
  @IsIn(['SUP', 'SOU', 'AEP'], { each: true })
  @ArrayMinSize(1)
  @ApiProperty({
    example: 'particulier',
    enum: ['SUP', 'SOU', 'AEP'],
    description: 'Type d\'eau',
    type: [String]
  })
  typesEau: string[];

  @IsString()
  @Length(5)
  @IsOptional()
  @ApiProperty({
    example: '69001',
    description: 'Code postal de la commune',
  })
  commune: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'x',
    description: 'Identifiant de l\'adresse',
  })
  idAdresse: string;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  @ApiProperty({
    example: '180',
    description: 'Longitude',
  })
  lon: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  @ApiProperty({
    example: '90',
    description: 'Latitude',
  })
  lat: number;
}