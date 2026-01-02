import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../organization/guards/organization.guard';
import { CurrentOrganization } from '../auth/decorators/organization.decorator';

@Controller('communications')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class CommunicationController {
  constructor(
    private readonly communicationService: CommunicationService,
  ) {}

  @Post('send')
  async sendMessage(
    @CurrentOrganization() organization: any,
    @Body() dto: SendMessageDto,
  ) {
    return this.communicationService.sendMessage({
      ...dto,
      organizationId: organization.id,
    });
  }
}

