import { Injectable, Logger } from '@nestjs/common';
import { AIProvider, AIResponse } from './ai-provider.interface';

/**
 * Mock AI Provider for development/testing
 * Returns structured mock responses without calling external APIs
 */
@Injectable()
export class MockAIProvider implements AIProvider {
  private readonly logger = new Logger(MockAIProvider.name);

  async processTextUnderstanding(prompt: string, context?: any): Promise<AIResponse> {
    this.logger.log('Mock: Processing text understanding');
    return {
      data: {
        extracted: {
          intent: 'automation_request',
          entities: { task: 'data processing', priority: 'normal' },
        },
      },
      confidence: 0.8,
      tokensUsed: 150,
      cost: 0.001,
      model: 'mock',
      provider: 'mock',
    };
  }

  async classify(prompt: string, categories?: string[]): Promise<AIResponse> {
    this.logger.log('Mock: Classifying');
    return {
      data: {
        category: categories?.[0] || 'general',
        confidence: 0.9,
      },
      confidence: 0.9,
      tokensUsed: 50,
      cost: 0.0001,
      model: 'mock',
      provider: 'mock',
    };
  }

  async summarize(prompt: string, maxLength?: number): Promise<AIResponse> {
    this.logger.log('Mock: Summarizing');
    return {
      data: {
        summary: 'This is a mock summary of the input text.',
      },
      confidence: 0.85,
      tokensUsed: 100,
      cost: 0.0005,
      model: 'mock',
      provider: 'mock',
    };
  }

  async suggestDecision(prompt: string, options?: any): Promise<AIResponse> {
    this.logger.log('Mock: Suggesting decision');
    return {
      data: {
        suggestion: 'proceed',
        reasoning: 'Mock reasoning based on input analysis',
        confidence: 0.75,
      },
      confidence: 0.75,
      tokensUsed: 200,
      cost: 0.002,
      model: 'mock',
      provider: 'mock',
    };
  }

  async extract(prompt: string, schema?: any): Promise<AIResponse> {
    this.logger.log('Mock: Extracting data');
    return {
      data: {
        extracted: {
          field1: 'value1',
          field2: 'value2',
        },
      },
      confidence: 0.8,
      tokensUsed: 120,
      cost: 0.0008,
      model: 'mock',
      provider: 'mock',
    };
  }
}

