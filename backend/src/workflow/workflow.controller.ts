import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../organization/guards/organization.guard';
import { CurrentOrganization } from '../auth/decorators/organization.decorator';

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  @UseGuards(OrganizationGuard)
  async create(
    @CurrentOrganization() organization: any,
    @Body() dto: CreateWorkflowDto,
  ) {
    return this.workflowService.create(organization.id, dto);
  }

  @Get()
  @UseGuards(OrganizationGuard)
  async findAll(@CurrentOrganization() organization: any) {
    return this.workflowService.findAll(organization.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.workflowService.findOne(id);
  }

  @Put(':id')
  @UseGuards(OrganizationGuard)
  async update(
    @Param('id') id: string,
    @CurrentOrganization() organization: any,
    @Body() dto: Partial<CreateWorkflowDto>,
  ) {
    return this.workflowService.update(id, organization.id, dto);
  }
}


