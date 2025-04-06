#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

class NotemdServer {
  private server: Server;
  private config: any;

  constructor() {
    this.server = new Server(
      {
        name: 'notemd-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupResourceHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'process_markdown',
          description: 'Process markdown files with LLM',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: { type: 'string' },
              provider: { 
                type: 'string',
                enum: ['deepseek', 'openai', 'anthropic', 'google', 'mistral', 'azure_openai']
              },
              chunk_size: { type: 'number', default: 3000 },
              temperature: { type: 'number', default: 0.5 },
              max_tokens: { type: 'number', default: 8192 }
            },
            required: ['file_path', 'provider']
          }
        },
        {
          name: 'delete_duplicates',
          description: 'Delete duplicate markdown files',
          inputSchema: {
            type: 'object',
            properties: {
              knowledge_base_path: { type: 'string' },
              search_path: { type: 'string' }
            },
            required: ['knowledge_base_path', 'search_path']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        if (request.params.name === 'process_markdown') {
          return await this.processMarkdown(request.params.arguments);
        } else if (request.params.name === 'delete_duplicates') {
          return await this.deleteDuplicates(request.params.arguments);
        }
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
      } catch (error: unknown) {
        if (error instanceof McpError) throw error;
        if (error instanceof Error) {
          throw new McpError(ErrorCode.InternalError, error.message);
        }
        throw new McpError(ErrorCode.InternalError, 'Unknown error occurred');
      }
    });
  }

  private async processMarkdown(args: any) {
    // Implementation of markdown processing
    const { file_path, provider, chunk_size, temperature, max_tokens } = args;
    
    // Validate file exists
    if (!fs.existsSync(file_path)) {
      throw new McpError(ErrorCode.InvalidParams, 'File does not exist');
    }

    // Process file using the specified provider
    const result = await this.callLLMProvider(provider, {
      file_path,
      chunk_size,
      temperature,
      max_tokens
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  private async deleteDuplicates(args: any) {
    const { knowledge_base_path, search_path } = args;
    
    // Validate paths
    if (!fs.existsSync(knowledge_base_path)) {
      throw new McpError(ErrorCode.InvalidParams, 'Knowledge base path does not exist');
    }
    if (!fs.existsSync(search_path)) {
      throw new McpError(ErrorCode.InvalidParams, 'Search path does not exist');
    }

    // Implementation of duplicate deletion
    const result = await this.findAndDeleteDuplicates(knowledge_base_path, search_path);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  private async callLLMProvider(provider: string, params: any) {
    const { file_path, chunk_size, temperature, max_tokens } = params;
    const fileContent = fs.readFileSync(file_path, 'utf-8');
    
    try {
      let result;
      const apiKey = process.env[`${provider.toUpperCase()}_API_KEY`];
      if (!apiKey) {
        throw new McpError(ErrorCode.InvalidParams, `${provider} API key not found in environment variables`);
      }

      const baseUrl = process.env[`${provider.toUpperCase()}_ENDPOINT`] || this.getDefaultEndpoint(provider);
      const model = process.env[`${provider.toUpperCase()}_MODEL`] || this.getDefaultModel(provider);

      switch (provider.toLowerCase()) {
        case 'deepseek':
          result = await axios.post(`${baseUrl}/v1/chat/completions`, {
            model,
            messages: [{ role: 'user', content: fileContent }],
            temperature,
            max_tokens,
            chunk_size
          }, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          break;
          
        case 'openai':
          result = await axios.post(`${baseUrl}/v1/chat/completions`, {
            model,
            messages: [{ role: 'user', content: fileContent }],
            temperature,
            max_tokens
          }, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          break;
          
        case 'anthropic':
          result = await axios.post(`${baseUrl}/v1/messages`, {
            model,
            messages: [{ role: 'user', content: fileContent }],
            max_tokens,
            temperature
          }, {
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json'
            }
          });
          break;
          
        case 'google':
          result = await axios.post(`${baseUrl}/v1beta/models/${model}:generateContent`, {
            contents: [{ parts: [{ text: fileContent }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: max_tokens
            }
          }, {
            params: { key: apiKey },
            headers: { 'Content-Type': 'application/json' }
          });
          break;

        case 'azure_openai':
          const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview';
          result = await axios.post(`${baseUrl}/openai/deployments/${model}/chat/completions`, {
            messages: [{ role: 'user', content: fileContent }],
            temperature,
            max_tokens
          }, {
            params: { 'api-version': apiVersion },
            headers: {
              'api-key': apiKey,
              'Content-Type': 'application/json'
            }
          });
          break;

        case 'mistral':
          result = await axios.post(`${baseUrl}/chat/completions`, {
            model,
            messages: [{ role: 'user', content: fileContent }],
            temperature,
            max_tokens
          }, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          break;

        case 'ollama':
          result = await axios.post(`${baseUrl}/api/chat`, {
            model,
            messages: [{ role: 'user', content: fileContent }],
            options: {
              temperature,
              num_ctx: max_tokens
            }
          }, {
            headers: { 'Content-Type': 'application/json' }
          });
          break;
          
        default:
          throw new McpError(ErrorCode.InvalidParams, `Unsupported provider: ${provider}`);
      }
      
      return result.data;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new McpError(ErrorCode.InternalError, `LLM API error: ${error.message}`);
      }
      throw new McpError(ErrorCode.InternalError, 'Unknown LLM API error');
    }
  }

  private getDefaultEndpoint(provider: string): string {
    const endpoints: Record<string, string> = {
      deepseek: 'https://api.deepseek.com',
      openai: 'https://api.openai.com',
      anthropic: 'https://api.anthropic.com',
      google: 'https://generativelanguage.googleapis.com',
      azure_openai: '',
      mistral: 'https://api.mistral.ai/v1',
      ollama: 'http://localhost:11434'
    };
    return endpoints[provider] || '';
  }

  private getDefaultModel(provider: string): string {
    const models: Record<string, string> = {
      deepseek: 'deepseek-reasoner',
      openai: 'gpt-4o',
      anthropic: 'claude-3-opus',
      google: 'gemini-pro',
      azure_openai: 'gpt-4o',
      mistral: 'mistral-large-latest',
      ollama: 'qwen2.5:7b'
    };
    return models[provider] || '';
  }

  private async findAndDeleteDuplicates(knowledgeBasePath: string, searchPath: string) {
    const allFiles = fs.readdirSync(searchPath, { recursive: true, withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.md'))
      .map(dirent => path.join(dirent.path, dirent.name));

    const deletePathFiles = fs.readdirSync(knowledgeBasePath, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.md'))
      .map(dirent => path.join(dirent.path, dirent.name));

    const filesToDelete = new Set<string>();
    const filenameGroups = new Map<string, string[]>();

    // Group files by basename (case-insensitive)
    allFiles.forEach(file => {
      const basename = path.basename(file, '.md').toLowerCase();
      if (!filenameGroups.has(basename)) {
        filenameGroups.set(basename, []);
      }
      filenameGroups.get(basename)?.push(file);
    });

    // Check for exact matches
    deletePathFiles.forEach(file => {
      const basename = path.basename(file, '.md').toLowerCase();
      const matches = filenameGroups.get(basename) || [];
      
      if (matches.length > 1) {
        const hasMatchOutsideDeletePath = matches.some(
          match => match !== file && !match.startsWith(knowledgeBasePath)
        );
        
        if (hasMatchOutsideDeletePath) {
          filesToDelete.add(file);
        }
      }
    });

    // Delete the files
    const deletionResults: {file: string; status: string}[] = [];
    filesToDelete.forEach(file => {
      try {
        fs.unlinkSync(file);
        deletionResults.push({file, status: 'deleted'});
      } catch (error) {
        deletionResults.push({
          file, 
          status: error instanceof Error ? error.message : 'failed'
        });
      }
    });

    return {
      totalFilesScanned: allFiles.length,
      duplicatesFound: filesToDelete.size,
      deletionResults
    };
  }

  private setupResourceHandlers() {
    // Setup resource handlers if needed
    // ...
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Notemd MCP server running on stdio');
  }
}

const server = new NotemdServer();
server.run().catch(console.error);
