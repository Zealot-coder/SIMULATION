import { IsString, IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class AddMemberDto {
  @IsString()
  userId: string;

  @IsEnum(UserRole)
  role: UserRole;
}

