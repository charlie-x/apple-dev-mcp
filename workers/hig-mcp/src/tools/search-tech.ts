/**
 * search_technical_documentation tool implementation
 */

import type { Env, TechnicalSearchResult } from '../types';
import { AppleAPIClient } from '../services/apple-api';

export interface SearchTechParams {
  query: string;
  framework?: string;
  platform?: string;
}

export interface SearchTechResult {
  results: TechnicalSearchResult[];
  total: number;
  query: string;
  success: boolean;
  error?: string;
}

/**
 * search technical documentation using apple api
 */
export async function searchTechnical(
  env: Env,
  params: SearchTechParams
): Promise<SearchTechResult> {
  // input validation
  if (!params || typeof params !== 'object') {
    throw new Error('invalid arguments: expected object');
  }

  const { query, framework, platform } = params;
  const maxResults = 20; // sensible default

  // validate required parameters
  if (typeof query !== 'string') {
    throw new Error('invalid query: must be a string');
  }

  if (query.trim().length === 0) {
    return {
      results: [],
      total: 0,
      query: query.trim(),
      success: true,
    };
  }

  if (query.length > 100) {
    throw new Error('query too long: maximum 100 characters allowed');
  }

  try {
    let results: TechnicalSearchResult[] = [];

    // try fast, targeted api search with timeout
    try {
      const apiClient = new AppleAPIClient(env);
      const searchPromise = performFastAPISearch(apiClient, query.trim(), {
        framework,
        platform,
        maxResults,
      });

      // race condition: api search vs 15-second timeout
      const timeoutPromise = new Promise<TechnicalSearchResult[]>((_, reject) => {
        setTimeout(() => reject(new Error('api search timeout')), 15000);
      });

      results = await Promise.race([searchPromise, timeoutPromise]);
    } catch {
      // api failed or timed out - return empty results
      results = [];
    }

    return {
      results: results.slice(0, maxResults),
      total: results.length,
      query: query.trim(),
      success: results.length > 0,
      error:
        results.length === 0
          ? 'no results found. try a more specific technical symbol like "UIButton" or "ScrollView".'
          : undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'unknown error';

    return {
      results: [],
      total: 0,
      query: query.trim(),
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * perform fast, targeted api search with intelligent framework targeting
 */
async function performFastAPISearch(
  apiClient: AppleAPIClient,
  query: string,
  options: {
    framework?: string;
    platform?: string;
    maxResults?: number;
  }
): Promise<TechnicalSearchResult[]> {
  const { framework, platform, maxResults = 10 } = options;

  // if framework specified, search only that framework (faster)
  if (framework) {
    return await apiClient.searchFramework(framework, query, {
      platform,
      maxResults: Math.min(maxResults, 5), // limit to reduce api calls
    });
  }

  // for general searches, use global search with sequential framework processing
  const results = await apiClient.searchGlobal(query, {
    platform,
    maxResults,
  });

  return results.slice(0, maxResults);
}
