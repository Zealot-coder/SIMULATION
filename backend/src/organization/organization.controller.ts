import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationService.create(user.id, dto);
  }

  @Get('my')
  async getMyOrganizations(@CurrentUser() user: any) {
    return this.organizationService.getUserOrganizations(user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.organizationService.findOne(id);
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.organizationService.findBySlug(slug);
  }

  @Post(':id/members')
  async addMember(
    @Param('id') organizationId: string,
    @CurrentUser() user: any,
    @Body() dto: AddMemberDto,
  ) {
    // Verify user has permission (owner or staff)
    await this.organizationService.verifyMembership(user.id, organizationId);
    return this.organizationService.addMember(organizationId, user.id, dto);
  }
}


