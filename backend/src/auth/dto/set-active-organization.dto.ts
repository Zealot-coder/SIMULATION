import { IsString } from 'class-validator';

export class SetActiveOrganizationDto {
  @IsString()
  organizationId: string;
}
