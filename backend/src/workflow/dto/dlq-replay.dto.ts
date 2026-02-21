import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsObject, IsOptional, Max, Min, ValidateNested } from 'class-validator';

export enum DlqReplayMode {
  STEP_ONLY = 'STEP_ONLY',
  FROM_STEP = 'FROM_STEP',
}

export class DlqReplayRetryOverrideDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxRetries?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  baseDelayMs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxDelayMs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  factor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  jitterRatio?: number;
}

export class DlqReplayDto {
  @IsEnum(DlqReplayMode)
  mode!: DlqReplayMode;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fromStepIndex?: number;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => DlqReplayRetryOverrideDto)
  overrideRetryPolicy?: DlqReplayRetryOverrideDto;
}
