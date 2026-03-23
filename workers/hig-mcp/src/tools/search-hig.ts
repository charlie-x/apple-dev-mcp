/**
 * search_human_interface_guidelines tool implementation
 */

import type { Env, ApplePlatform, SearchResult } from '../types';
import { ContentSearchService } from '../services/content-search';
import { getFallbackResults } from '../data/fallback';

export interface SearchHIGParams {
  query: string;
  platform?: ApplePlatform;
}

export interface SearchHIGResult {
  results: SearchResult[];
  total: number;
  query: string;
  filters: {
    platform?: ApplePlatform;
    category?: string;
  };
}

/**
 * search human interface guidelines content by keywords/topics
 */
export async function searchHIG(env: Env, params: SearchHIGParams): Promise<SearchHIGResult> {
  // input validation
  if (!params || typeof params !== 'object') {
    throw new Error('invalid arguments: expected object');
  }

  const { query, platform } = params;
  const limit = 3; // return top 3 results with full content

  // validate required parameters
  if (typeof query !== 'string') {
    throw new Error('invalid query: must be a string');
  }

  // handle empty/whitespace queries gracefully
  if (query.trim().length === 0) {
    return {
      results: [],
      total: 0,
      query: query.trim(),
      filters: {
        platform,
      },
    };
  }

  if (query.length > 100) {
    throw new Error('query too long: maximum 100 characters allowed');
  }

  // validate optional parameters
  const validPlatforms = ['iOS', 'macOS', 'watchOS', 'tvOS', 'visionOS', 'universal'];
  if (platform && !validPlatforms.includes(platform)) {
    throw new Error(`invalid platform: must be one of ${validPlatforms.join(', ')}`);
  }

  try {
    let results: SearchResult[] = [];

    // use content search as primary source
    try {
      const contentSearch = new ContentSearchService(env);
      results = await contentSearch.searchContent(query.trim(), platform, undefined, limit);

      // if no results, fall back to minimal results
      if (results.length === 0) {
        results = getFallbackResults(query.trim(), platform, limit);
      }
    } catch {
      // fall back to minimal hardcoded results
      results = getFallbackResults(query.trim(), platform, limit);
    }

    return {
      results: results.slice(0, limit),
      total: results.length,
      query: query.trim(),
      filters: {
        platform,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'unknown error';
    throw new Error(`search failed: ${errorMessage}`);
  }
}
