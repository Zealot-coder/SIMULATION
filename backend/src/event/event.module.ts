import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { EventProcessor } from './event.processor';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => WorkflowModule),
    BullModule.registerQueue({
      name: 'events',
    }),
    EventEmitterModule.forRoot(),
  ],
  controllers: [EventController],
  providers: [EventService, EventProcessor],
  exports: [EventService],
})
export class EventModule {}

