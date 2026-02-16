import { Controller, Get, HttpCode } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(200)
  async getHealth() {
    return this.healthService.getHealthStatus();
  }

  @Get('detailed')
  @HttpCode(200)
  async getDetailedHealth() {
    return this.healthService.getDetailedHealthStatus();
  }
}
