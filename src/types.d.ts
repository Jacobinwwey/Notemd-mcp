declare module '@modelcontextprotocol/sdk' {
  export class Server {
    constructor(config: any, options: any);
    onerror: (error: Error) => void;
    close(): Promise<void>;
    connect(transport: any): Promise<void>;
    setRequestHandler(schema: any, handler: (request: any) => Promise<any>): void;
  }

  export class StdioServerTransport {
    constructor();
  }

  export const CallToolRequestSchema: any;
  export const ListToolsRequestSchema: any;
}
