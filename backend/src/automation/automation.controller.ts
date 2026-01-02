import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { AutomationService } from './automation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../organization/guards/organization.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentOrganization } from '../auth/decorators/organization.decorator';

@Controller('automation')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post('create')
  async create(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Body()
    body: {
      taskDescription: string;
      inputData: any;
      expectedOutput?: string;
      workflowId?: string;
    },
  ) {
    return this.automationService.createJob(
      organization.id,
      user.id,
      body,
    );
  }

  @Post('run')
  async run(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Body()
    body: {
      taskDescription: string;
      inputData: any;
      expectedOutput?: string;
    },
  ) {
    return this.automationService.createJob(
      organization.id,
      user.id,
      body,
    );
  }

  @Get(':id/status')
  async getStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.automationService.getJobStatus(id, user.id);
  }

  @Get(':id/result')
  async getResult(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.automationService.getJobResult(id, user.id);
  }

  @Get('history')
  async getHistory(
    @CurrentUser() user: any,
    @CurrentOrganization() organization: any,
    @Query('limit') limit?: string,
  ) {
    return this.automationService.getJobHistory(
      organization.id,
      user.id,
      limit ? parseInt(limit) : 50,
    );
  }
}

