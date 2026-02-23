import { Module } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { CommunicationController } from './communication.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { GovernanceModule } from '../governance/governance.module';

@Module({
  imports: [PrismaModule, GovernanceModule],
  controllers: [CommunicationController],
  providers: [CommunicationService],
  exports: [CommunicationService],
})
export class CommunicationModule {}


