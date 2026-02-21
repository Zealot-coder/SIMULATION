import { IsEnum, IsString, IsOptional } from 'class-validator';
import { CommunicationChannel } from '@prisma/client';

export class SendMessageDto {
  @IsEnum(CommunicationChannel)
  channel: CommunicationChannel;

  @IsString()
  to: string;

  @IsOptional()
  @IsString()
  toName?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}


