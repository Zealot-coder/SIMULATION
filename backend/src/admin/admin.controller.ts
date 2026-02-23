import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AssignOrganizationPlanDto } from './dto/assign-organization-plan.dto';
import { ResetOrganizationUsageDto } from './dto/reset-organization-usage.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('system/metrics')
  async getSystemMetrics() {
    return this.adminService.getSystemMetrics();
  }

  @Get('system/errors')
  async getRecentErrors(@Query('limit') limit?: string) {
    return this.adminService.getRecentErrors(limit ? parseInt(limit, 10) : 50);
  }

  @Get('system/logs')
  async getRecentSystemLogs(
    @Query('correlationId') correlationId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getRecentLogs(
      correlationId,
      organizationId,
      limit ? parseInt(limit, 10) : 100,
    );
  }

  @Get('user-metrics')
  async getUserMetrics(@Query('months') months?: string) {
    return this.adminService.getUserMetrics(months ? parseInt(months) : 6);
  }

  @Get('users')
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Post('user/:id/disable')
  async disableUser(@Param('id') id: string) {
    return this.adminService.disableUser(id);
  }

  @Post('user/:id/enable')
  async enableUser(@Param('id') id: string) {
    return this.adminService.enableUser(id);
  }

  @Get('automations')
  async getAutomations() {
    return this.adminService.getAutomations();
  }

  @Get('ai-usage')
  async getAIUsage(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getAIUsage(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('analytics')
  async getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('logs')
  async getLogs(
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getLogs({
      entityType,
      action,
      userId,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('export')
  async exportAnalytics(@Query('format') format?: 'csv' | 'json') {
    const data = await this.adminService.exportAnalytics(format || 'json');
    
    if (format === 'csv') {
      return {
        data,
        contentType: 'text/csv',
        filename: `analytics-${new Date().toISOString()}.csv`,
      };
    }

    return data;
  }

  @Get('plans')
  async getPlans() {
    return this.adminService.getPlans();
  }

  @Post('plans')
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.adminService.createPlan(dto);
  }

  @Patch('plans/:id')
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.adminService.updatePlan(id, dto);
  }

  @Get('organization-plans')
  async getOrganizationPlans(@Query('organizationId') organizationId?: string) {
    return this.adminService.getOrganizationPlans(organizationId);
  }

  @Put('organization-plans/:organizationId')
  async assignOrganizationPlan(
    @Param('organizationId') organizationId: string,
    @Body() dto: AssignOrganizationPlanDto,
  ) {
    return this.adminService.assignOrganizationPlan({
      organizationId,
      planId: dto.planId,
      overrideConfig: dto.overrideConfig,
    });
  }

  @Get('organization-usage')
  async getOrganizationUsage(
    @Query('organizationId') organizationId?: string,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getOrganizationUsage({
      organizationId,
      date,
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('organization-usage/:organizationId/reset')
  async resetOrganizationUsage(
    @Param('organizationId') organizationId: string,
    @Body() dto: ResetOrganizationUsageDto,
  ) {
    return this.adminService.resetOrganizationUsage({
      organizationId,
      date: dto.date,
      resetConcurrent: dto.resetConcurrent,
    });
  }

  @Get('safety-violations')
  async getSafetyViolations(
    @Query('organizationId') organizationId?: string,
    @Query('workflowId') workflowId?: string,
    @Query('workflowExecutionId') workflowExecutionId?: string,
    @Query('limitCode') limitCode?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getSafetyViolations({
      organizationId,
      workflowId,
      workflowExecutionId,
      limitCode,
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}


