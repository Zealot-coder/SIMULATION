import { IsString, MinLength } from 'class-validator';

export class DlqResolutionDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}
