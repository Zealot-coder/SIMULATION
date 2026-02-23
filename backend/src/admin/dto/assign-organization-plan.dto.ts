import { IsObject, IsOptional, IsString } from 'class-validator';

export class AssignOrganizationPlanDto {
  @IsString()
  planId: string;

  @IsOptional()
  @IsObject()
  overrideConfig?: Record<string, unknown>;
}
