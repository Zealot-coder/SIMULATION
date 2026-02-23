import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OpenAIProvider } from './providers/openai.provider';
import { MockAIProvider } from './providers/mock.provider';
import { AIProvider } from './providers/ai-provider.interface';
import { GovernanceModule } from '../governance/governance.module';

@Module({
  imports: [PrismaModule, ConfigModule, GovernanceModule],
  controllers: [AiController],
  providers: [
    AiService,
    {
      provide: 'AI_PROVIDER',
      useFactory: (configService: ConfigService) => {
        const provider = configService.get<string>('AI_PROVIDER') || 'mock';
        const apiKey = configService.get<string>('OPENAI_API_KEY');
        
        if (provider === 'openai' && apiKey) {
          return new OpenAIProvider(configService);
        }
        
        // Default to mock for development
        return new MockAIProvider();
      },
      inject: [ConfigService],
    },
  ],
  exports: [AiService],
})
export class AiModule {}

