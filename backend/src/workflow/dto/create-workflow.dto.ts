import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsObject,
  IsInt,
  IsNumber,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventType } from '@prisma/client';

class WorkflowRetryPolicyDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  maxRetries?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  baseDelayMs?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  factor?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxDelayMs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  jitterRatio?: number;
}

class WorkflowStepDto {
  @IsString()
  stepType: string; // "ai_process", "send_message", "update_record", "wait", "approval"

  @IsObject()
  config: Record<string, any>;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WorkflowRetryPolicyDto)
  retryPolicy?: WorkflowRetryPolicyDto;
}

export class CreateWorkflowDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(EventType)
  triggerEventType?: EventType;

  @IsOptional()
  @IsObject()
  triggerCondition?: Record<string, any>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps: WorkflowStepDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}


