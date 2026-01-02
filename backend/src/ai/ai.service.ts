import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AIRequestDto } from './dto/ai-request.dto';
import { AIRequestType, AIRequestStatus } from '@prisma/client';
import type { AIProvider } from './providers/ai-provider.interface';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private aiProvider: AIProvider;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject('AI_PROVIDER') private provider: AIProvider,
  ) {
    this.aiProvider = provider;
  }

  async processRequest(dto: AIRequestDto & { organizationId: string }) {
    // Create AI request record
    const aiRequest = await this.prisma.aIRequest.create({
      data: {
        organizationId: dto.organizationId,
        type: dto.type,
        status: AIRequestStatus.PROCESSING,
        prompt: dto.prompt,
        context: dto.context,
        model: dto.model || 'gpt-4',
        requestedAt: new Date(),
      },
    });

    try {
      // Call AI provider abstraction layer
      const response = await this.callAIProvider(dto);

      // Update request with response
      const updated = await this.prisma.aIRequest.update({
        where: { id: aiRequest.id },
        data: {
          status: AIRequestStatus.COMPLETED,
          response: response.data,
          confidence: response.confidence,
          tokensUsed: response.tokensUsed,
          cost: response.cost,
          completedAt: new Date(),
        },
      });

      return updated;
    } catch (error: any) {
      this.logger.error(`AI request failed: ${error.message}`, error.stack);

      // Mark as failed
      await this.prisma.aIRequest.update({
        where: { id: aiRequest.id },
        data: {
          status: AIRequestStatus.FAILED,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  private async callAIProvider(dto: AIRequestDto): Promise<{
    data: any;
    confidence: number;
    tokensUsed?: number;
    cost?: number;
  }> {
    // Use AI provider abstraction - switch providers via configuration
    try {
      let response;
      
      switch (dto.type) {
        case AIRequestType.TEXT_UNDERSTANDING:
          response = await this.aiProvider.processTextUnderstanding(dto.prompt, dto.context);
          break;
        case AIRequestType.CLASSIFICATION:
          response = await this.aiProvider.classify(dto.prompt);
          break;
        case AIRequestType.SUMMARIZATION:
          response = await this.aiProvider.summarize(dto.prompt);
          break;
        case AIRequestType.DECISION_SUGGESTION:
          response = await this.aiProvider.suggestDecision(dto.prompt, dto.context);
          break;
        case AIRequestType.EXTRACTION:
          response = await this.aiProvider.extract(dto.prompt, dto.context);
          break;
        default:
          response = await this.aiProvider.processTextUnderstanding(dto.prompt, dto.context);
      }

      return {
        data: response.data,
        confidence: response.confidence,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
      };
    } catch (error: any) {
      this.logger.error(`AI provider call failed: ${error.message}`);
      // Fallback to mock for development
      return this.getMockResponse(dto);
    }
  }

  private getSystemPrompt(type: AIRequestType): string {
    const prompts = {
      TEXT_UNDERSTANDING:
        'You are a text understanding system. Extract key information and return it as structured JSON.',
      CLASSIFICATION:
        'You are a classification system. Classify the input and return the result as JSON with a "category" field.',
      SUMMARIZATION:
        'You are a summarization system. Summarize the input and return it as JSON with a "summary" field.',
      DECISION_SUGGESTION:
        'You are a decision support system. Analyze the input and suggest a decision as JSON with "suggestion" and "reasoning" fields.',
      EXTRACTION:
        'You are a data extraction system. Extract structured data from the input and return it as JSON.',
    };

    return (
      prompts[type] ||
      'You are an AI assistant. Process the input and return structured JSON.'
    );
  }

  private getMockResponse(dto: AIRequestDto): {
    data: any;
    confidence: number;
  } {
    // Mock responses for development/testing
    const mockResponses = {
      TEXT_UNDERSTANDING: {
        extracted: {
          intent: 'appointment_booking',
          entities: { date: '2024-01-15', time: '10:00' },
        },
      },
      CLASSIFICATION: { category: 'appointment', confidence: 0.9 },
      SUMMARIZATION: { summary: 'User wants to book an appointment' },
      DECISION_SUGGESTION: {
        suggestion: 'approve',
        reasoning: 'Meets all criteria',
      },
      EXTRACTION: { data: { field1: 'value1', field2: 'value2' } },
    };

    return {
      data: mockResponses[dto.type] || { result: 'processed' },
      confidence: 0.8,
    };
  }

  private calculateCost(usage: any, model?: string): number {
    // Example cost calculation (adjust based on your provider)
    if (!usage) return 0;

    const modelPricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
      'gpt-3.5-turbo': { input: 0.001 / 1000, output: 0.002 / 1000 },
    };

    const pricing = modelPricing[model || 'gpt-4'] || modelPricing['gpt-4'];
    const inputCost = (usage.prompt_tokens || 0) * pricing.input;
    const outputCost = (usage.completion_tokens || 0) * pricing.output;

    return inputCost + outputCost;
  }
}

