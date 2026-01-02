import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider, AIResponse, AIProviderConfig } from './ai-provider.interface';

@Injectable()
export class OpenAIProvider implements AIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private config: AIProviderConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      provider: 'openai',
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
      apiUrl: this.configService.get<string>('OPENAI_API_URL') || 'https://api.openai.com/v1',
      model: this.configService.get<string>('OPENAI_MODEL') || 'gpt-4',
      maxTokens: 2000,
      temperature: 0.7,
    };
  }

  async processTextUnderstanding(prompt: string, context?: any): Promise<AIResponse> {
    return this.callAPI(prompt, 'You are a text understanding system. Extract key information and return it as structured JSON.', context);
  }

  async classify(prompt: string, categories?: string[]): Promise<AIResponse> {
    const systemPrompt = categories
      ? `Classify the input into one of these categories: ${categories.join(', ')}. Return JSON with "category" and "confidence" fields.`
      : 'Classify the input and return JSON with "category" and "confidence" fields.';
    return this.callAPI(prompt, systemPrompt);
  }

  async summarize(prompt: string, maxLength?: number): Promise<AIResponse> {
    const systemPrompt = maxLength
      ? `Summarize the input in ${maxLength} words or less. Return JSON with "summary" field.`
      : 'Summarize the input. Return JSON with "summary" field.';
    return this.callAPI(prompt, systemPrompt);
  }

  async suggestDecision(prompt: string, options?: any): Promise<AIResponse> {
    const systemPrompt = 'Analyze the input and suggest a decision. Return JSON with "suggestion", "reasoning", and "confidence" fields.';
    return this.callAPI(prompt, systemPrompt, options);
  }

  async extract(prompt: string, schema?: any): Promise<AIResponse> {
    const systemPrompt = schema
      ? `Extract data matching this schema: ${JSON.stringify(schema)}. Return JSON.`
      : 'Extract structured data from the input. Return JSON.';
    return this.callAPI(prompt, systemPrompt);
  }

  private async callAPI(prompt: string, systemPrompt: string, context?: any): Promise<AIResponse> {
    if (!this.config.apiKey) {
      this.logger.warn('OpenAI API key not configured');
      throw new Error('OpenAI provider not configured');
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
            ...(context ? [{ role: 'user', content: `Context: ${JSON.stringify(context)}` }] : []),
          ],
          response_format: { type: 'json_object' },
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = JSON.parse(data.choices[0].message.content);

      return {
        data: content,
        confidence: 0.85,
        tokensUsed: data.usage?.total_tokens,
        cost: this.calculateCost(data.usage),
        model: this.config.model,
        provider: 'openai',
      };
    } catch (error: any) {
      this.logger.error(`OpenAI API call failed: ${error.message}`);
      throw error;
    }
  }

  private calculateCost(usage: any): number {
    if (!usage) return 0;
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
      'gpt-3.5-turbo': { input: 0.001 / 1000, output: 0.002 / 1000 },
    };
    const modelPricing = pricing[this.config.model || 'gpt-4'] || pricing['gpt-4'];
    return (usage.prompt_tokens || 0) * modelPricing.input + (usage.completion_tokens || 0) * modelPricing.output;
  }
}

