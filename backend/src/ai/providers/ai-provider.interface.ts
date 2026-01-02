/**
 * AI Provider Abstraction Interface
 * 
 * This interface allows switching between different AI providers
 * (OpenAI, Anthropic, local models, African-hosted models) without
 * changing the core automation logic.
 */
export interface AIProvider {
  /**
   * Process a text understanding request
   */
  processTextUnderstanding(prompt: string, context?: any): Promise<AIResponse>;

  /**
   * Classify input into categories
   */
  classify(prompt: string, categories?: string[]): Promise<AIResponse>;

  /**
   * Summarize content
   */
  summarize(prompt: string, maxLength?: number): Promise<AIResponse>;

  /**
   * Suggest a decision based on input
   */
  suggestDecision(prompt: string, options?: any): Promise<AIResponse>;

  /**
   * Extract structured data from text
   */
  extract(prompt: string, schema?: any): Promise<AIResponse>;
}

export interface AIResponse {
  data: any;
  confidence: number;
  tokensUsed?: number;
  cost?: number;
  model?: string;
  provider?: string;
}

export interface AIProviderConfig {
  provider: 'openai' | 'anthropic' | 'local' | 'custom';
  apiKey?: string;
  apiUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

