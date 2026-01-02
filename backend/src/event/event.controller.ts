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
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../organization/guards/organization.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentOrganization } from '../auth/decorators/organization.decorator';

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @UseGuards(OrganizationGuard)
  async create(
    @CurrentOrganization() organization: any,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventService.create(organization.id, dto);
  }

  @Get()
  @UseGuards(OrganizationGuard)
  async findByOrganization(
    @CurrentOrganization() organization: any,
    @Query('limit') limit?: string,
  ) {
    return this.eventService.findByOrganization(
      organization.id,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventService.findOne(id);
  }
}

