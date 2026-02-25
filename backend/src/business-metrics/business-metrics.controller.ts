import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentOrganization } from '../auth/decorators/organization.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../organization/guards/organization.guard';
import { BusinessMetricsService } from './business-metrics.service';
import { MetricsQueryDto } from './dto/metrics-query.dto';

@Controller('metrics')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class BusinessMetricsController {
  constructor(private readonly businessMetricsService: BusinessMetricsService) {}

  @Get('summary')
  async getSummary(
    @CurrentOrganization() organization: any,
    @Query() query: MetricsQueryDto,
  ) {
    return this.businessMetricsService.getSummary({
      organizationId: organization.id,
      from: this.parseDate(query.from),
      to: this.parseDate(query.to),
    });
  }

  @Get('trends')
  async getTrends(
    @CurrentOrganization() organization: any,
    @Query() query: MetricsQueryDto,
  ) {
    return this.businessMetricsService.getTrends({
      organizationId: organization.id,
      from: this.parseDate(query.from),
      to: this.parseDate(query.to),
      granularity: query.granularity,
    });
  }

  @Get('workflow-health')
  async getWorkflowHealth(
    @CurrentOrganization() organization: any,
    @Query() query: MetricsQueryDto,
  ) {
    return this.businessMetricsService.getWorkflowHealth({
      organizationId: organization.id,
      from: this.parseDate(query.from),
      to: this.parseDate(query.to),
      limit: query.limit,
    });
  }

  private parseDate(value?: string): Date | undefined {
    if (!value) {
      return undefined;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }
    return parsed;
  }
}
