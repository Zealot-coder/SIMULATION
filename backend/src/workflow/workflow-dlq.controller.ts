import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DlqListQueryDto } from './dto/dlq-list-query.dto';
import { DlqReplayDto } from './dto/dlq-replay.dto';
import { DlqResolutionDto } from './dto/dlq-resolution.dto';
import { WorkflowDlqService } from './workflow-dlq.service';

@Controller('workflow-dlq')
@UseGuards(JwtAuthGuard)
export class WorkflowDlqController {
  constructor(private readonly workflowDlqService: WorkflowDlqService) {}

  @Get()
  async list(@CurrentUser() user: any, @Query() query: DlqListQueryDto) {
    return this.workflowDlqService.list(user, query);
  }

  @Get(':id')
  async getById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.workflowDlqService.getById(user, id);
  }

  @Post(':id/replay')
  async replay(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: DlqReplayDto,
  ) {
    return this.workflowDlqService.replay(user, id, dto);
  }

  @Post(':id/resolve')
  async resolve(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: DlqResolutionDto,
  ) {
    return this.workflowDlqService.resolve(user, id, dto);
  }

  @Post(':id/ignore')
  async ignore(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: DlqResolutionDto,
  ) {
    return this.workflowDlqService.ignore(user, id, dto);
  }
}
