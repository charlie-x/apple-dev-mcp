/**
 * mcp server configuration and tool registration
 * creates a new mcpserver instance per request for security
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Env } from './types';
import { searchHIG } from './tools/search-hig';
import { searchTechnical } from './tools/search-tech';
import { searchUnified } from './tools/search-unified';

/**
 * create and configure mcp server instance
 * must be called per-request for security (mcp sdk 1.26.0 requirement)
 */
export function createServer(env: Env): McpServer {
  const server = new McpServer({
    name: 'hig-mcp',
    version: '1.0.0',
  });

  // register search_human_interface_guidelines tool
  server.tool(
    'search_human_interface_guidelines',
    'search apple human interface guidelines for design principles',
    {
      query: z.string().describe('search query (keywords, component names, design concepts)'),
      platform: z
        .enum(['iOS', 'macOS', 'watchOS', 'tvOS', 'visionOS', 'universal'])
        .optional()
        .describe('optional: filter by apple platform'),
    },
    async (params) => {
      const result = await searchHIG(env, params as any);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // register search_technical_documentation tool
  server.tool(
    'search_technical_documentation',
    'search apple technical documentation and api references',
    {
      query: z
        .string()
        .describe('search query (api names, symbols, frameworks)'),
      framework: z
        .string()
        .optional()
        .describe('optional: search within specific framework (e.g., "SwiftUI", "UIKit")'),
      platform: z
        .string()
        .optional()
        .describe('optional: filter by platform (iOS, macOS, etc.)'),
    },
    async (params) => {
      const result = await searchTechnical(env, params as any);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // register search_unified tool
  server.tool(
    'search_unified',
    'unified search across both hig design guidelines and technical documentation',
    {
      query: z.string().describe('search query (keywords, component names, design concepts)'),
      platform: z
        .enum(['iOS', 'macOS', 'watchOS', 'tvOS', 'visionOS', 'universal'])
        .optional()
        .describe('optional: filter by apple platform'),
    },
    async (params) => {
      const result = await searchUnified(env, params as any);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  return server;
}
