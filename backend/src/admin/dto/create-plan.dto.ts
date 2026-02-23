import { IsInt, IsString, Min } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  maxExecutionTimeMs: number;

  @IsInt()
  @Min(1)
  maxStepIterations: number;

  @IsInt()
  @Min(1)
  maxWorkflowSteps: number;

  @IsInt()
  @Min(0)
  maxDailyWorkflowRuns: number;

  @IsInt()
  @Min(0)
  maxDailyMessages: number;

  @IsInt()
  @Min(0)
  maxDailyAiRequests: number;

  @IsInt()
  @Min(0)
  maxConcurrentRuns: number;
}
