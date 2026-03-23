/**
 * content search service ported from staticcontentsearchservice
 * uses inline search index and kv storage for markdown files
 */

import type { Env, SearchResult, ApplePlatform, HIGCategory, SearchIndexEntry } from '../types';
import { SEARCH_INDEX } from '../data/search-index';
import { expandQueryWithSynonyms, CONCEPT_MAPPINGS } from '../data/synonyms';
import { getFallbackResults } from '../data/fallback';
import { loadContentFromKV } from './kv-cache';

export class ContentSearchService {
  private env: Env;
  private contentCache = new Map<string, string>();

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * search static content with enhanced relevance scoring
   */
  async searchContent(
    query: string,
    platform?: ApplePlatform,
    category?: HIGCategory,
    limit: number = 3
  ): Promise<SearchResult[]> {
    // if no search index available, use fallback
    if (SEARCH_INDEX.length === 0) {
      return getFallbackResults(query, platform, limit);
    }

    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter((term) => term.length > 1);
    const results: SearchResult[] = [];

    // search through index entries
    for (const entry of SEARCH_INDEX) {
      let relevanceScore = 0;
      const highlights: string[] = [];

      // enhanced title matching with multi-term support and concept detection
      const titleLower = entry.title.toLowerCase();
      if (titleLower === queryLower) {
        relevanceScore += 1.0;
        highlights.push(entry.title);
      } else if (titleLower.includes(queryLower)) {
        relevanceScore += 0.6;
        highlights.push(entry.title);
      } else {
        // check individual query terms in title
        let titleTermMatches = 0;
        for (const term of queryTerms) {
          if (titleLower.includes(term)) {
            titleTermMatches++;
          }
        }
        if (titleTermMatches > 0) {
          relevanceScore += (titleTermMatches / queryTerms.length) * 0.4;
          highlights.push(entry.title);
        }

        // boost exact concept matches
        const conceptBoost = this.getConceptBoost(queryLower, titleLower);
        if (conceptBoost > 0) {
          relevanceScore += conceptBoost;
          highlights.push(entry.title);
        }
      }

      // enhanced keyword matching with synonym expansion
      const synonymExpansion = expandQueryWithSynonyms(queryLower);
      let keywordScore = 0;
      for (const expandedQuery of synonymExpansion) {
        const keywordMatches = entry.keywords.filter((k) => {
          const keywordLower = k.toLowerCase();
          return keywordLower.includes(expandedQuery) || expandedQuery.includes(keywordLower);
        });
        if (keywordMatches.length > 0) {
          const exactMatches = entry.keywords.filter((k) => k.toLowerCase() === expandedQuery);
          if (exactMatches.length > 0) {
            keywordScore += exactMatches.length * 0.5;
          } else {
            keywordScore += keywordMatches.length * 0.3;
          }
          highlights.push(...keywordMatches);
        }
      }
      relevanceScore += Math.min(keywordScore, 0.8); // cap keyword score

      // enhanced snippet matching with term-based scoring
      const snippetLower = entry.snippet.toLowerCase();
      if (snippetLower.includes(queryLower)) {
        relevanceScore += 0.4;
      } else {
        // score based on individual term matches in snippet
        let snippetTermMatches = 0;
        for (const term of queryTerms) {
          if (snippetLower.includes(term)) {
            snippetTermMatches++;
          }
        }
        if (snippetTermMatches > 0) {
          relevanceScore += (snippetTermMatches / queryTerms.length) * 0.3;
        }
      }

      // content quality bonuses
      if (entry.hasGuidelines) {
        relevanceScore += 0.2; // guidelines are highly valuable
      }

      if (entry.hasSpecifications) {
        relevanceScore += 0.15; // specifications provide concrete values
      }

      if (entry.hasExamples) {
        relevanceScore += 0.1; // examples help implementation
      }

      if (entry.hasStructuredContent) {
        relevanceScore += 0.05; // well-structured content is easier to use
      }

      // quality score bonus
      if (entry.quality && entry.quality.score) {
        relevanceScore += entry.quality.score * 0.3; // up to 0.3 bonus for high quality
      }

      // apply filters
      if (
        platform &&
        platform !== 'universal' &&
        entry.platform !== platform &&
        entry.platform !== 'universal'
      ) {
        continue;
      }

      if (category && entry.category !== category) {
        continue;
      }

      // only include relevant results
      if (relevanceScore > 0.08) {
        // get full content from kv
        const fullContent = await this.getFullContent(entry);

        results.push({
          id: entry.id,
          title: entry.title,
          url: entry.url,
          platform: entry.platform as ApplePlatform,
          category: entry.category as HIGCategory,
          relevanceScore,
          content: fullContent,
          type: this.determineType(entry),
          highlights: highlights.slice(0, 3), // limit highlights
        });
      }
    }

    // sort by relevance and return top results
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
  }

  /**
   * get concept boost for direct concept matches
   */
  private getConceptBoost(query: string, title: string): number {
    const expectedTitle = CONCEPT_MAPPINGS.get(query);
    if (expectedTitle && title.includes(expectedTitle)) {
      return 0.8; // strong boost for concept matches
    }

    // check for partial concept matches
    for (const [queryPattern, titlePattern] of CONCEPT_MAPPINGS) {
      if (query.includes(queryPattern) && title.includes(titlePattern)) {
        return 0.4; // moderate boost for partial matches
      }
    }

    return 0;
  }

  /**
   * get full content for an entry from kv storage
   */
  private async getFullContent(entry: SearchIndexEntry): Promise<string> {
    try {
      const contentPath = this.getContentKey(entry);

      // check memory cache first
      if (this.contentCache.has(contentPath)) {
        return this.contentCache.get(contentPath) || '';
      }

      // load from kv
      const content = await loadContentFromKV(this.env, entry.platform, entry.filename);

      if (content) {
        // extract content after front matter
        const contentStart = content.indexOf('---\n', 4);
        const actualContent = contentStart > 0 ? content.slice(contentStart + 4) : content;

        // cache in memory for this request
        this.contentCache.set(contentPath, actualContent);
        return actualContent;
      }

      return entry.snippet || `# ${entry.title}\n\ncontent not available.`;
    } catch {
      return entry.snippet || `# ${entry.title}\n\ncontent unavailable.`;
    }
  }

  /**
   * get kv key for content
   */
  private getContentKey(entry: SearchIndexEntry): string {
    return `${entry.platform}:${entry.filename}`;
  }

  /**
   * determine result type based on entry
   */
  private determineType(entry: SearchIndexEntry): 'section' | 'component' | 'guideline' {
    if (entry.hasGuidelines) return 'guideline';
    const titleLower = entry.title.toLowerCase();
    if (
      titleLower.includes('button') ||
      titleLower.includes('picker') ||
      titleLower.includes('slider')
    ) {
      return 'component';
    }
    return 'section';
  }

  /**
   * check if static content is available
   */
  isContentAvailable(): boolean {
    return SEARCH_INDEX.length > 0;
  }

  /**
   * get content statistics
   */
  getContentStats(): { sections: number; indexSize: string } {
    return {
      sections: SEARCH_INDEX.length,
      indexSize: `${Math.round((JSON.stringify(SEARCH_INDEX).length / 1024))}KB`,
    };
  }
}
