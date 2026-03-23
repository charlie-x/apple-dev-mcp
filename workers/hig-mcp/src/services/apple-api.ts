/**
 * apple content api client ported to use native fetch
 * caches responses in kv storage
 */

import type {
  Env,
  TechnicalSearchResult,
  Technology,
  FrameworkData,
  SymbolData,
} from '../types';
import { cacheAPIResponse } from './kv-cache';

const BASE_URL = 'https://developer.apple.com/tutorials/data';

const HEADERS = {
  'User-Agent': 'hig-mcp/1.0.0 (Development Purpose; Educational Use)',
  Referer: 'https://developer.apple.com/documentation/',
  Accept: 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  DNT: '1',
};

export class AppleAPIClient {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * make api request with caching and timeout
   */
  private async makeRequest<T>(url: string): Promise<T> {
    const cacheKey = `api:${url}`;

    return cacheAPIResponse(
      this.env,
      cacheKey,
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        try {
          const response = await fetch(url, {
            headers: HEADERS,
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`api request failed: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          return data as T;
        } finally {
          clearTimeout(timeoutId);
        }
      },
      600 // 10 minute cache ttl
    );
  }

  /**
   * get technologies list
   */
  async getTechnologies(): Promise<Record<string, Technology>> {
    const url = `${BASE_URL}/documentation/technologies.json`;
    const data = await this.makeRequest<any>(url);
    return data.references || {};
  }

  /**
   * get framework data
   */
  async getFramework(frameworkName: string): Promise<FrameworkData> {
    const url = `${BASE_URL}/documentation/${frameworkName}.json`;
    return await this.makeRequest<FrameworkData>(url);
  }

  /**
   * get symbol data
   */
  async getSymbol(path: string): Promise<SymbolData> {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const url = `${BASE_URL}/${cleanPath}.json`;
    return await this.makeRequest<SymbolData>(url);
  }

  /**
   * search across frameworks with direct symbol lookup
   */
  async searchGlobal(
    query: string,
    options: {
      symbolType?: string;
      platform?: string;
      maxResults?: number;
    } = {}
  ): Promise<TechnicalSearchResult[]> {
    const { maxResults = 20 } = options;
    const results: TechnicalSearchResult[] = [];

    try {
      // try direct symbol lookup first
      const directResults = await this.tryDirectSymbolLookup(query, options);
      results.push(...directResults);

      // if not enough results, search frameworks
      if (results.length < maxResults) {
        const technologies = await this.getTechnologies();
        const frameworks = Object.values(technologies).filter(
          (tech) => tech.kind === 'symbol' && tech.role === 'collection'
        );

        // prioritise common frameworks
        const prioritised = this.prioritiseFrameworks(frameworks, query);

        // search top 2 frameworks sequentially
        for (const framework of prioritised.slice(0, 2)) {
          if (results.length >= maxResults) break;

          try {
            const frameworkResults = await this.searchFramework(framework.title, query, {
              symbolType: options.symbolType,
              platform: options.platform,
              maxResults: Math.ceil((maxResults - results.length) / 2),
            });
            results.push(...frameworkResults);

            // stop early if we have good results
            if (results.length >= 10) break;
          } catch {
            continue;
          }
        }
      }

      return results
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, maxResults);
    } catch (error) {
      throw new Error(`global technical search failed: ${error}`);
    }
  }

  /**
   * try direct symbol lookup for common patterns
   */
  private async tryDirectSymbolLookup(
    query: string,
    options: {
      symbolType?: string;
      platform?: string;
    }
  ): Promise<TechnicalSearchResult[]> {
    const results: TechnicalSearchResult[] = [];

    const symbolPatterns = [
      { framework: this.guessFramework(query), symbol: query },
      { framework: 'UIKit', symbol: query.startsWith('UI') ? query : `UI${query}` },
      { framework: 'AppKit', symbol: query.startsWith('NS') ? query : `NS${query}` },
      { framework: 'SwiftUI', symbol: query },
    ];

    for (const pattern of symbolPatterns) {
      if (results.length >= 3) break;

      try {
        const symbolPath = `documentation/${pattern.framework.toLowerCase()}/${pattern.symbol.toLowerCase()}`;
        const symbolData = await this.getSymbol(symbolPath);

        if (symbolData && symbolData.metadata) {
          const relevanceScore = this.calculateDirectSymbolRelevance(
            symbolData.metadata.title,
            query
          );

          results.push({
            title: symbolData.metadata.title,
            description: this.extractText(symbolData.abstract || []),
            path: `/${symbolPath}`,
            framework: pattern.framework,
            symbolKind: symbolData.metadata.symbolKind,
            platforms: this.formatPlatforms(symbolData.metadata.platforms || []),
            url: `https://developer.apple.com/${symbolPath}`,
            relevanceScore,
            type: 'technical' as const,
          });
        }
      } catch {
        continue;
      }
    }

    return results;
  }

  /**
   * guess the most likely framework for a symbol
   */
  private guessFramework(symbol: string): string {
    const symbolLower = symbol.toLowerCase();

    if (symbolLower.startsWith('ui')) return 'UIKit';
    if (symbolLower.startsWith('ns')) return 'AppKit';
    if (symbolLower.startsWith('ca')) return 'QuartzCore';
    if (symbolLower.startsWith('cl')) return 'CoreLocation';
    if (symbolLower.startsWith('av')) return 'AVFoundation';

    // common swiftui symbols
    const swiftuiSymbols = [
      'button',
      'text',
      'image',
      'list',
      'vstack',
      'hstack',
      'zstack',
      'navigationview',
      'tabview',
    ];
    if (swiftuiSymbols.includes(symbolLower)) {
      return 'SwiftUI';
    }

    // default to uikit for ui-related queries
    if (
      symbolLower.includes('view') ||
      symbolLower.includes('button') ||
      symbolLower.includes('label')
    ) {
      return 'UIKit';
    }

    return 'Foundation';
  }

  /**
   * calculate relevance score for direct symbol matches
   */
  private calculateDirectSymbolRelevance(symbolTitle: string, query: string): number {
    const titleLower = symbolTitle.toLowerCase();
    const queryLower = query.toLowerCase();

    if (titleLower === queryLower) return 1.0;
    if (titleLower.includes(queryLower)) return 0.9;
    if (queryLower.includes(titleLower)) return 0.8;
    return 0.7;
  }

  /**
   * prioritise frameworks based on query hints
   */
  private prioritiseFrameworks(frameworks: Technology[], query: string): Technology[] {
    const queryLower = query.toLowerCase();
    const priorities = new Map<string, number>();

    frameworks.forEach((framework) => {
      let priority = 0;
      const name = framework.title.toLowerCase();

      // boost based on query hints
      if (
        queryLower.includes('ui') ||
        queryLower.includes('button') ||
        queryLower.includes('view')
      ) {
        if (name === 'uikit') priority += 100;
        if (name === 'swiftui') priority += 90;
      }

      if (
        queryLower.includes('swift') ||
        queryLower.includes('view') ||
        queryLower.includes('stack')
      ) {
        if (name === 'swiftui') priority += 100;
        if (name === 'uikit') priority += 80;
      }

      if (queryLower.includes('ns') || queryLower.includes('appkit')) {
        if (name === 'appkit') priority += 100;
      }

      // general framework popularity
      if (name === 'swiftui') priority += 50;
      if (name === 'uikit') priority += 45;
      if (name === 'foundation') priority += 40;
      if (name === 'appkit') priority += 35;
      if (name === 'core graphics') priority += 30;

      priorities.set(framework.title, priority);
    });

    return frameworks.sort((a, b) => (priorities.get(b.title) || 0) - (priorities.get(a.title) || 0));
  }

  /**
   * search within a specific framework
   */
  async searchFramework(
    frameworkName: string,
    query: string,
    options: {
      symbolType?: string;
      platform?: string;
      maxResults?: number;
    } = {}
  ): Promise<TechnicalSearchResult[]> {
    const { maxResults = 20 } = options;
    const results: TechnicalSearchResult[] = [];

    try {
      const framework = await this.getFramework(frameworkName);
      const searchPattern = this.createSearchPattern(query);

      // search through all references
      Object.entries(framework.references || {}).forEach(([_id, ref]) => {
        if (results.length >= maxResults) return;

        if (this.matchesSearch(ref, searchPattern, options)) {
          const relevanceScore = this.calculateRelevanceScore(ref, query);

          results.push({
            title: ref.title,
            description: this.extractText(ref.abstract || []),
            path: ref.url,
            framework: frameworkName,
            symbolKind: ref.kind,
            platforms: this.formatPlatforms(ref.platforms || framework.metadata?.platforms),
            url: `https://developer.apple.com${ref.url}`,
            relevanceScore,
            type: 'technical' as const,
          });
        }
      });

      // search through topic sections
      if (framework.topicSections) {
        for (const section of framework.topicSections) {
          if (section.identifiers) {
            for (const identifier of section.identifiers) {
              if (results.length >= maxResults) break;

              const ref = framework.references?.[identifier];
              if (ref && this.matchesSearch(ref, searchPattern, options)) {
                const relevanceScore = this.calculateRelevanceScore(ref, query);

                results.push({
                  title: ref.title,
                  description: this.extractText(ref.abstract || []),
                  path: ref.url,
                  framework: frameworkName,
                  symbolKind: ref.kind,
                  platforms: this.formatPlatforms(
                    ref.platforms || framework.metadata?.platforms
                  ),
                  url: `https://developer.apple.com${ref.url}`,
                  relevanceScore,
                  type: 'technical' as const,
                });
              }
            }
          }
        }
      }

      return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      throw new Error(`framework search failed for ${frameworkName}: ${error}`);
    }
  }

  // helper methods
  private createSearchPattern(query: string): RegExp {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
    return new RegExp(pattern, 'i');
  }

  private matchesSearch(
    ref: any,
    pattern: RegExp,
    options: { symbolType?: string; platform?: string }
  ): boolean {
    if (!ref.title) return false;

    // title match
    if (!pattern.test(ref.title)) return false;

    // symbol type filter
    if (options.symbolType && ref.kind !== options.symbolType) return false;

    // platform filter
    if (options.platform && ref.platforms) {
      const hasPlat = ref.platforms.some((p: any) =>
        p.name?.toLowerCase().includes(options.platform!.toLowerCase())
      );
      if (!hasPlat) return false;
    }

    return true;
  }

  private calculateRelevanceScore(ref: any, query: string): number {
    const title = ref.title?.toLowerCase() || '';
    const queryLower = query.replace(/\*/g, '').toLowerCase();

    if (title === queryLower) return 1.0; // exact match
    if (title.startsWith(queryLower)) return 0.9; // prefix match
    if (title.includes(queryLower)) return 0.7; // contains match
    return 0.5; // pattern match
  }

  extractText(abstract: { text: string; type: string }[]): string {
    return abstract?.map((item) => item.text).join('') || '';
  }

  private formatPlatforms(platforms: any[]): string {
    if (!platforms || platforms.length === 0) return 'all platforms';
    return platforms
      .map((p) => `${p.name} ${p.introducedAt}+${p.beta ? ' (beta)' : ''}`)
      .join(', ');
  }
}
