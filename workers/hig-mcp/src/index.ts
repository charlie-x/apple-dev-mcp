/**
 * cloudflare worker entry point
 * serves mcp server via streamable http transport
 */

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createServer } from './server';
import type { Env } from './types';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // health check endpoint
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          service: 'hig-mcp',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        }
      );
    }

    // mcp endpoint
    if (url.pathname === '/mcp' || url.pathname === '/') {
      // security requirement: create new server per request (mcp sdk 1.26.0)
      const server = createServer(env);

      // create transport in stateless mode (no session id generator)
      const transport = new WebStandardStreamableHTTPServerTransport({
        enableJsonResponse: true,
      });

      // connect server to transport
      await server.connect(transport);

      // handle the request
      return transport.handleRequest(request);
    }

    // 404 for unknown paths
    return new Response('not found', { status: 404 });
  },
};
