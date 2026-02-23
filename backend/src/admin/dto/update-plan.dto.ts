import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxExecutionTimeMs?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxStepIterations?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxWorkflowSteps?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDailyWorkflowRuns?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDailyMessages?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxDailyAiRequests?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxConcurrentRuns?: number;
}
