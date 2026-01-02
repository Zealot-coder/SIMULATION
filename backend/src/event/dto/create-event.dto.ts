import { IsEnum, IsString, IsObject, IsOptional } from 'class-validator';
import { EventType } from '@prisma/client';

export class CreateEventDto {
  @IsEnum(EventType)
  type: EventType;

  @IsString()
  name: string;

  @IsObject()
  payload: Record<string, any>;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

