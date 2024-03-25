import { CreateSubscriptionDto } from './create_subscription.dto';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionDto extends CreateSubscriptionDto {
  @IsString()
  @ApiProperty({
    example: 'xxx.xxx.xxx.xxx',
    description: 'IP utilisée lors de l\'inscription',
  })
  ip: string;

  @IsString()
  @ApiProperty({
    example: '',
    description: 'Libellé localisation',
  })
  libelleLocalisation: string;
}