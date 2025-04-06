import { MARKDOWN_PROCESSING_PROMPT, PROCESSING_RULES } from '../processors/prompts.js';
import type { RequestInfo, RequestInit } from 'node-fetch';
const fetch = (url: RequestInfo, init?: RequestInit) => 
  import('node-fetch').then(({default: fetch}) => fetch(url, init as any));

export interface LLMProvider {
  name: string;
  processMarkdown(content: string): Promise<string>;
}

interface LLMConfig {
  apiKey?: string;
  endpoint?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutHours?: number;
}

export class DeepSeekProvider implements LLMProvider {
  name = 'deepseek';
  private config: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    this.config = {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      endpoint: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.MAX_TOKENS || '2000'),
      ...config
    };
  }
  
  async processMarkdown(content: string): Promise<string> {
    console.log(`Processing markdown with ${this.config.model} (${content.length} chars)`);
    
    const controller = new AbortController();
    const timeout = this.config.timeoutHours 
      ? setTimeout(
          () => controller.abort(),
          this.config.timeoutHours * 3600 * 1000
        )
      : null;

    try {
      console.log('Sending request to DeepSeek API...');
      const response = await fetch(`${this.config.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [{
            role: 'user',
            content: MARKDOWN_PROCESSING_PROMPT + '\n' + content
          }],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens
        }),
        signal: controller.signal
      });

      console.log(`Received response status: ${response.status}`);
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      console.log('Successfully processed markdown');
      return this.applyProcessingRules(data.choices[0].message.content);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Request timed out after ${this.config.timeoutHours} hours`);
      }
      throw err;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  private applyProcessingRules(content: string): string {
    // Apply all rules from PROCESSING_RULES
    let processed = content;
    
    if (PROCESSING_RULES.SKIP_CONVENTIONAL_NAMES) {
      // Skip names like products/companies etc.
    }

    if (PROCESSING_RULES.REMOVE_DUPLICATES) {
      // Remove duplicate concepts
    }

    return processed;
  }
}

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private config: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    this.config = {
      apiKey: process.env.OPENAI_API_KEY || '',
      endpoint: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: 'gpt-4',
      temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.MAX_TOKENS || '2000'),
      ...config
    };
  }
  
  async processMarkdown(content: string): Promise<string> {
    // TODO: Implement actual API call
    return this.applyProcessingRules(content);
  }

  private applyProcessingRules(content: string): string {
    // Same rule application as DeepSeek
    return content;
  }
}

export class AnthropicProvider implements LLMProvider {
  name = 'anthropic';
  private config: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    this.config = {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
      endpoint: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
      model: 'claude-3-opus',
      temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.MAX_TOKENS || '2000'),
      ...config
    };
  }

  async processMarkdown(content: string): Promise<string> {
    // TODO: Implement Anthropic API call
    return content;
  }
}

export class GoogleProvider implements LLMProvider {
  name = 'google';
  private config: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    this.config = {
      apiKey: process.env.GOOGLE_API_KEY || '',
      model: 'gemini-pro',
      temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.MAX_TOKENS || '2000'),
      ...config
    };
  }

  async processMarkdown(content: string): Promise<string> {
    // TODO: Implement Google API call
    return content;
  }
}

export class MistralProvider implements LLMProvider {
  name = 'mistral';
  private config: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    this.config = {
      apiKey: process.env.MISTRAL_API_KEY || '',
      endpoint: process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1',
      model: 'mistral-large',
      temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.MAX_TOKENS || '2000'),
      ...config
    };
  }

  async processMarkdown(content: string): Promise<string> {
    // TODO: Implement Mistral API call
    return content;
  }
}

export class OllamaProvider implements LLMProvider {
  name = 'ollama';
  private config: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    this.config = {
      endpoint: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: 'llama2',
      temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.MAX_TOKENS || '2000'),
      ...config
    };
  }

  async processMarkdown(content: string): Promise<string> {
    // TODO: Implement Ollama API call
    return content;
  }
}

export class AzureProvider implements LLMProvider {
  name = 'azure';
  private config: LLMConfig;

  constructor(config?: Partial<LLMConfig>) {
    this.config = {
      apiKey: process.env.AZURE_API_KEY || '',
      endpoint: process.env.AZURE_ENDPOINT || '',
      model: 'gpt-4',
      temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.MAX_TOKENS || '2000'),
      ...config
    };
  }

  async processMarkdown(content: string): Promise<string> {
    // TODO: Implement actual API call
    return this.applyProcessingRules(content);
  }

  private applyProcessingRules(content: string): string {
    return content;
  }
}


export function getProvider(name: string, config?: Partial<LLMConfig>): LLMProvider {
  switch (name.toLowerCase()) {
    case 'deepseek':
      return new DeepSeekProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'azure':
      return new AzureProvider(config);
    case 'google':
      return new GoogleProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'mistral':
      return new MistralProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}
