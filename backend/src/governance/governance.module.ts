import { Global, Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GovernanceController } from './governance.controller';
import { GovernanceService } from './governance.service';

@Global()
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [GovernanceController],
  providers: [GovernanceService],
  exports: [GovernanceService],
})
export class GovernanceModule {}
