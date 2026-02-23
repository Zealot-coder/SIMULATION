import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ResetOrganizationUsageDto {
  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  resetConcurrent?: boolean;
}
