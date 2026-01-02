import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { AIRequestDto } from './dto/ai-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../organization/guards/organization.guard';
import { CurrentOrganization } from '../auth/decorators/organization.decorator';

@Controller('ai')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('process')
  async processRequest(
    @CurrentOrganization() organization: any,
    @Body() dto: AIRequestDto,
  ) {
    return this.aiService.processRequest({
      ...dto,
      organizationId: organization.id,
    });
  }
}

