# Notemd-mcp MCP Server

A Model Context Protocol server with multi-client support

This is a TypeScript-based MCP server that implements a notes system with support for multiple AI clients. It demonstrates core MCP concepts by providing:

- Resources representing text notes with URIs and metadata
- Tools for creating and processing notes
- Support for Claude and Cline AI clients

## Features

### Resources
- List and access notes via `note://` URIs
- Each note has a title, content and metadata
- Plain text mime type for simple content access

### Tools
- `create_note` - Create new text notes
  - Takes title and content as required parameters
  - Stores note in server state
- `process_with_claude` - Process notes using Claude AI
- `process_with_cline` - Process notes using Cline AI

### Clients
- Claude AI integration via @anthropic-ai/sdk
- Cline AI integration via @cline-ai/sdk

## Installation

```bash
npm install -g Notemd-mcp
```

## Configuration

### Environment Variables
Create a `.env` file based on `.env.example` with your settings:

```bash
# Required - Choose LLM Provider (deepseek/openai/anthropic/google/mistral/ollama/azure)
LLM_PROVIDER=deepseek

# DeepSeek Configuration  
DEEPSEEK_API_KEY=your-api-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-reasoner

# OpenAI Configuration
OPENAI_API_KEY=your-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4

# Anthropic Configuration
ANTHROPIC_API_KEY=your-api-key-here
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=claude-3-opus

# Google Configuration
GOOGLE_API_KEY=your-api-key-here
GOOGLE_MODEL=gemini-pro

# Mistral Configuration
MISTRAL_API_KEY=your-api-key-here
MISTRAL_BASE_URL=https://api.mistral.ai/v1
MISTRAL_MODEL=mistral-large

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# Azure Configuration
AZURE_API_KEY=your-api-key-here
AZURE_ENDPOINT=your-endpoint-here
AZURE_MODEL=gpt-4

# Common Parameters
TEMPERATURE=0.7
MAX_TOKENS=2000
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-reasoner

# OpenAI Configuration
OPENAI_API_KEY=your-api-key  
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4

# Processing Parameters
CHUNK_SIZE=3000  # Text chunk size in characters
PROCESSING_INTENSITY=1  # Processing intensity level (1-3):
                        # 1 - Basic processing (fastest)
                        # 2 - Standard processing (balanced)
                        # 3 - Deep processing (most thorough but slower)
OUTPUT_DIR=./processed  # Output directory

# Scheduling  
SCHEDULE=0 * * * *  # cron format
INITIAL_DELAY=0     # minutes
```

### Server Configuration
To use with supported clients, add the server config:

On MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "Notemd-mcp": {
      "command": "/path/to/Notemd-mcp/build/index.js",
      "clients": ["claude", "Cline"]
    }
  }
}
```

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

### Debugging

Use the MCP Inspector for debugging:
```bash
npm run inspector
```

## License

MIT License - See [LICENSE](LICENSE) file for details.
