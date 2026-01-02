import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../organization/guards/organization.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentOrganization } from '../auth/decorators/organization.decorator';
import { AuditAction } from '@prisma/client';

@Controller('audit')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async getLogs(
    @CurrentOrganization() organization: any,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.getLogs(organization.id, {
      entityType,
      entityId,
      userId,
      action,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Post('feedback')
  async createFeedback(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Body()
    body: {
      entityType: string;
      entityId: string;
      feedbackType: string;
      originalValue?: any;
      correctedValue?: any;
      comment?: string;
    },
  ) {
    return this.auditService.createFeedback(
      organization.id,
      user.id,
      body.entityType,
      body.entityId,
      body.feedbackType,
      {
        originalValue: body.originalValue,
        correctedValue: body.correctedValue,
        comment: body.comment,
      },
    );
  }
}

