/**
 * search_unified tool implementation
 * combines design guidelines and technical documentation
 */

import type { Env, ApplePlatform, SearchResult, TechnicalSearchResult, UnifiedSearchResult } from '../types';
import { searchHIG } from './search-hig';
import { searchTechnical } from './search-tech';

export interface SearchUnifiedParams {
  query: string;
  platform?: ApplePlatform;
}

export interface SearchUnifiedResult {
  results: UnifiedSearchResult[];
  designResults: SearchResult[];
  technicalResults: TechnicalSearchResult[];
  total: number;
  query: string;
  sources: string[];
  crossReferences: Array<{
    designSection: string;
    technicalSymbol: string;
    relevance: number;
  }>;
}

/**
 * unified search across both hig design guidelines and technical documentation
 */
export async function searchUnified(
  env: Env,
  params: SearchUnifiedParams
): Promise<SearchUnifiedResult> {
  const { query, platform } = params;

  // sensible defaults
  const maxResults = 20;

  // input validation
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('invalid query: must be a non-empty string');
  }

  if (query.length > 100) {
    throw new Error('query too long: maximum 100 characters allowed');
  }

  const sources: string[] = [];
  let designResults: SearchResult[] = [];
  let technicalResults: TechnicalSearchResult[] = [];

  try {
    // search design guidelines
    sources.push('design-guidelines');
    try {
      const designSearch = await searchHIG(env, { query, platform });
      designResults = designSearch.results;
    } catch {
      // fall through
    }

    // search technical documentation
    sources.push('technical-documentation');
    try {
      const technicalSearch = await searchTechnical(env, { query, platform });
      technicalResults = technicalSearch.results;
    } catch {
      // fall through
    }

    // generate cross-references between design and technical content
    const crossReferences = generateCrossReferences(designResults, technicalResults, query);

    // combine and rank results using unified scoring
    const unifiedResults = combineAndRankResults(
      designResults,
      technicalResults,
      crossReferences,
      maxResults
    );

    return {
      results: unifiedResults,
      designResults,
      technicalResults,
      total: unifiedResults.length,
      query: query.trim(),
      sources,
      crossReferences,
    };
  } catch (error) {
    throw new Error(
      `unified search failed: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}

/**
 * generate cross-references between design guidelines and technical documentation
 */
function generateCrossReferences(
  designResults: SearchResult[],
  technicalResults: TechnicalSearchResult[],
  query: string
): Array<{
  designSection: string;
  technicalSymbol: string;
  relevance: number;
}> {
  const crossReferences: Array<{
    designSection: string;
    technicalSymbol: string;
    relevance: number;
  }> = [];

  // common ui component mappings
  const componentMappings = new Map([
    // buttons
    ['button', ['Button', 'UIButton', 'NSButton', 'SwiftUI.Button']],
    ['buttons', ['Button', 'UIButton', 'NSButton', 'SwiftUI.Button']],

    // navigation
    [
      'navigation',
      ['NavigationView', 'UINavigationController', 'NSNavigationController', 'NavigationStack'],
    ],
    ['navigation bar', ['NavigationView', 'UINavigationBar', 'NSNavigationItem']],

    // lists
    ['list', ['List', 'UITableView', 'NSTableView', 'UICollectionView']],
    ['table', ['UITableView', 'NSTableView', 'TableView']],

    // text
    ['text', ['Text', 'UILabel', 'NSTextField', 'TextField']],
    ['label', ['Text', 'UILabel', 'NSTextField']],

    // images
    ['image', ['Image', 'UIImageView', 'NSImageView']],
    ['icon', ['Image', 'UIImageView', 'NSImageView', 'SF Symbols']],

    // controls
    ['picker', ['Picker', 'UIPickerView', 'NSPopUpButton']],
    ['slider', ['Slider', 'UISlider', 'NSSlider']],
    ['switch', ['Toggle', 'UISwitch', 'NSSwitch']],
    ['toggle', ['Toggle', 'UISwitch', 'NSSwitch']],

    // layout
    ['stack', ['VStack', 'HStack', 'ZStack', 'UIStackView', 'NSStackView']],
    ['scroll', ['ScrollView', 'UIScrollView', 'NSScrollView']],

    // sheets and popups
    ['sheet', ['Sheet', 'UIModalPresentationStyle', 'NSModalSession']],
    ['alert', ['Alert', 'UIAlertController', 'NSAlert']],
    ['popup', ['Popover', 'UIPopoverController', 'NSPopover']],
  ]);

  // extract key terms from query for mapping
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 2);

  for (const designResult of designResults) {
    for (const technicalResult of technicalResults) {
      let relevance = 0;

      // direct title matching
      const designTitle = designResult.title.toLowerCase();
      const technicalTitle = technicalResult.title.toLowerCase();

      // check if design title contains technical symbol name or vice versa
      if (designTitle.includes(technicalTitle) || technicalTitle.includes(designTitle)) {
        relevance += 0.8;
      }

      // component mapping-based relevance
      for (const [designTerm, technicalSymbols] of componentMappings) {
        if (designTitle.includes(designTerm)) {
          for (const symbol of technicalSymbols) {
            if (technicalTitle.includes(symbol.toLowerCase())) {
              relevance += 0.6;
              break;
            }
          }
        }
      }

      // query term overlap between design and technical content
      for (const term of queryTerms) {
        if (designTitle.includes(term) && technicalTitle.includes(term)) {
          relevance += 0.3;
        }
      }

      // platform consistency boost
      if (
        designResult.platform &&
        technicalResult.platforms &&
        typeof technicalResult.platforms === 'string'
      ) {
        const designPlatform = designResult.platform.toLowerCase();
        const technicalPlatforms = technicalResult.platforms.toLowerCase();
        if (technicalPlatforms.includes(designPlatform)) {
          relevance += 0.2;
        }
      }

      // framework preference: slightly boost uikit/appkit over swiftui
      if (technicalResult.framework === 'UIKit' || technicalResult.framework === 'AppKit') {
        relevance += 0.1;
      }

      // only include cross-references with meaningful relevance
      if (relevance >= 0.4) {
        const crossRefKey = `${designResult.title}:${technicalResult.title}`;
        // avoid duplicate cross-references
        if (
          !crossReferences.some(
            (ref) => `${ref.designSection}:${ref.technicalSymbol}` === crossRefKey
          )
        ) {
          crossReferences.push({
            designSection: designResult.title,
            technicalSymbol: technicalResult.title,
            relevance: Math.round(relevance * 100) / 100,
          });
        }
      }
    }
  }

  // sort by relevance and limit to top cross-references
  return crossReferences.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
}

/**
 * combine and rank design and technical results into unified search results
 */
function combineAndRankResults(
  designResults: SearchResult[],
  technicalResults: TechnicalSearchResult[],
  crossReferences: Array<{
    designSection: string;
    technicalSymbol: string;
    relevance: number;
  }>,
  maxResults: number
): UnifiedSearchResult[] {
  const unifiedResults: UnifiedSearchResult[] = [];

  // convert design results to unified format
  for (const result of designResults) {
    const hasCrossRef = crossReferences.some((ref) => ref.designSection === result.title);
    const crossRefBoost = hasCrossRef ? 0.2 : 0;

    unifiedResults.push({
      id: `design-${result.url}`,
      title: result.title,
      type: 'design',
      url: result.url,
      relevanceScore: result.relevanceScore + crossRefBoost,
      snippet: result.content || '',
      designContent: {
        platform: result.platform,
        category: result.category,
      },
    });
  }

  // convert technical results to unified format
  for (const result of technicalResults) {
    const hasCrossRef = crossReferences.some((ref) => ref.technicalSymbol === result.title);
    const crossRefBoost = hasCrossRef ? 0.2 : 0;

    unifiedResults.push({
      id: `technical-${result.path}`,
      title: result.title,
      type: 'technical',
      url: result.url,
      relevanceScore: result.relevanceScore + crossRefBoost,
      snippet: result.description,
      technicalContent: {
        framework: result.framework,
        symbolKind: result.symbolKind || '',
        platforms: result.platforms ? [result.platforms] : [],
        abstract: result.description,
        codeExamples: [],
      },
    });
  }

  // create combined results for high-confidence cross-references
  const processedCombinations = new Set<string>();
  for (const crossRef of crossReferences.slice(0, 5)) {
    // top 5 cross-references
    if (crossRef.relevance >= 0.6) {
      const designResult = designResults.find((r) => r.title === crossRef.designSection);
      const technicalResult = technicalResults.find((r) => r.title === crossRef.technicalSymbol);

      if (designResult && technicalResult) {
        const combinationKey = `${designResult.title}:${technicalResult.title}`;
        if (!processedCombinations.has(combinationKey)) {
          processedCombinations.add(combinationKey);

          // create concise snippet for combined results
          const designSnippet = (designResult.content || '').slice(0, 200);
          const techSnippet = technicalResult.description.slice(0, 200);

          unifiedResults.push({
            id: `combined-${designResult.url.split('/').pop()}-${technicalResult.path.split('/').pop()}`,
            title: `${designResult.title} + ${technicalResult.title}`,
            type: 'combined',
            url: designResult.url,
            relevanceScore:
              (designResult.relevanceScore + technicalResult.relevanceScore) / 2 +
              crossRef.relevance * 0.2,
            snippet: `design: ${designSnippet}... | implementation: ${techSnippet}...`,
            designContent: {
              platform: designResult.platform,
              category: designResult.category,
            },
            technicalContent: {
              framework: technicalResult.framework,
              symbolKind: technicalResult.symbolKind || '',
              platforms: technicalResult.platforms ? [technicalResult.platforms] : [],
              abstract: technicalResult.description,
              codeExamples: [],
            },
            combinedGuidance: {
              designPrinciples: [designSnippet],
              implementationSteps: [techSnippet],
              crossPlatformConsiderations: technicalResult.platforms
                ? [technicalResult.platforms]
                : [],
              accessibilityNotes: [
                `ensure ${designResult.title} follows accessibility guidelines`,
              ],
            },
          });
        }
      }
    }
  }

  // sort by relevance score and return top results
  return unifiedResults
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxResults);
}
