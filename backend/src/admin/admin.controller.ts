import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
}


