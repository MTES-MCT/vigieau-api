import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UsageFeedbackDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  feedback: string;
}