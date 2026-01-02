import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventType } from '@prisma/client';

class WorkflowStepDto {
  @IsString()
  stepType: string; // "ai_process", "send_message", "update_record", "wait", "approval"

  @IsObject()
  config: Record<string, any>;

  @IsOptional()
  @IsString()
  name?: string;
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

