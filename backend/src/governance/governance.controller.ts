import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentOrganization } from '../auth/decorators/organization.decorator';
import { OrganizationGuard } from '../organization/guards/organization.guard';
import { GovernanceService } from './governance.service';

@Controller('governance')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Get('limits')
  async getEffectiveLimits(@CurrentOrganization() organization: any) {
    return this.governanceService.resolveEffectiveLimits(organization.id);
  }

  @Get('usage')
  async getUsage(
    @CurrentOrganization() organization: any,
    @Query('date') date?: string,
  ) {
    return this.governanceService.getOrganizationUsage({
      organizationId: organization.id,
      date,
      limit: 1,
    });
  }

  @Get('violations')
  async getSafetyViolations(
    @CurrentOrganization() organization: any,
    @Query('limitCode') limitCode?: string,
    @Query('limit') limit?: string,
  ) {
    return this.governanceService.listSafetyViolations({
      organizationId: organization.id,
      limitCode,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }
}
