import { IsEnum, IsString, IsObject, IsOptional } from 'class-validator';
import { AIRequestType } from '@prisma/client';

export class AIRequestDto {
  @IsEnum(AIRequestType)
  type: AIRequestType;

  @IsString()
  prompt: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @IsOptional()
  @IsString()
  model?: string;
}

