/**
 * hardcoded fallback content for when kv storage is unavailable
 * provides minimal but useful responses for common queries
 */

import type { SearchResult, ApplePlatform } from '../types';

export interface FallbackItem {
  keywords: string[];
  title: string;
  platform: string;
  category: string;
  url: string;
  snippet: string;
}

export const FALLBACK_DATA: FallbackItem[] = [
  // buttons and touch targets
  {
    keywords: ['button', 'btn', 'press', 'tap', 'click'],
    title: 'Buttons',
    platform: 'iOS',
    category: 'visual-design',
    url: 'https://developer.apple.com/design/human-interface-guidelines/buttons',
    snippet:
      'buttons initiate app-specific actions, have customisable backgrounds, and can include a title or an icon. minimum touch target size is 44pt x 44pt.',
  },
  {
    keywords: ['touch', 'targets', '44pt', 'minimum', 'size', 'accessibility'],
    title: 'Touch Targets & Accessibility',
    platform: 'iOS',
    category: 'foundations',
    url: 'https://developer.apple.com/design/human-interface-guidelines/accessibility',
    snippet:
      'interactive elements must be large enough for people to interact with easily. a minimum touch target size of 44pt x 44pt ensures accessibility.',
  },

  // navigation
  {
    keywords: ['navigation', 'nav', 'navigate', 'menu', 'bar'],
    title: 'Navigation Bars',
    platform: 'iOS',
    category: 'navigation',
    url: 'https://developer.apple.com/design/human-interface-guidelines/navigation-bars',
    snippet:
      'a navigation bar appears at the top of an app screen, enabling navigation through a hierarchy of content.',
  },
  {
    keywords: ['tab', 'tabs', 'bottom'],
    title: 'Tab Bars',
    platform: 'iOS',
    category: 'navigation',
    url: 'https://developer.apple.com/design/human-interface-guidelines/tab-bars',
    snippet:
      'a tab bar appears at the bottom of an app screen and provides the ability to quickly switch between different sections of an app.',
  },

  // layout and design
  {
    keywords: ['layout', 'grid', 'spacing', 'margin'],
    title: 'Layout',
    platform: 'universal',
    category: 'layout',
    url: 'https://developer.apple.com/design/human-interface-guidelines/layout',
    snippet:
      'a consistent layout that adapts to various devices and contexts makes your app easier to use and helps people feel confident.',
  },
  {
    keywords: ['color', 'colours', 'theme', 'dark', 'light'],
    title: 'Color',
    platform: 'universal',
    category: 'color-and-materials',
    url: 'https://developer.apple.com/design/human-interface-guidelines/color',
    snippet:
      'color can indicate interactivity, impart vitality, and provide visual continuity.',
  },
  {
    keywords: ['typography', 'text', 'font', 'size'],
    title: 'Typography',
    platform: 'universal',
    category: 'typography',
    url: 'https://developer.apple.com/design/human-interface-guidelines/typography',
    snippet:
      "typography can help you clarify a hierarchy of information and make it easy for people to find what they're looking for.",
  },

  // accessibility and contrast
  {
    keywords: ['accessibility', 'a11y', 'voiceover', 'accessible'],
    title: 'Accessibility',
    platform: 'universal',
    category: 'foundations',
    url: 'https://developer.apple.com/design/human-interface-guidelines/accessibility',
    snippet:
      'people use apple accessibility features to personalise how they interact with their devices in ways that work for them.',
  },
  {
    keywords: ['contrast', 'color', 'wcag', 'visibility', 'readability'],
    title: 'Color Contrast & Accessibility',
    platform: 'universal',
    category: 'foundations',
    url: 'https://developer.apple.com/design/human-interface-guidelines/accessibility',
    snippet:
      'ensure sufficient color contrast for text and ui elements. follow wcag guidelines with minimum 4.5:1 contrast ratio for normal text.',
  },

  // custom interface patterns
  {
    keywords: ['custom', 'interface', 'patterns', 'design', 'user', 'expectations'],
    title: 'Custom Interface Patterns',
    platform: 'universal',
    category: 'foundations',
    url: 'https://developer.apple.com/design/human-interface-guidelines/',
    snippet:
      'when creating custom interfaces, maintain consistency with platform conventions and user expectations to ensure familiarity and usability.',
  },
  {
    keywords: ['user', 'interface', 'standards', 'guidelines', 'principles'],
    title: 'User Interface Standards',
    platform: 'universal',
    category: 'foundations',
    url: 'https://developer.apple.com/design/human-interface-guidelines/',
    snippet:
      'follow established interface standards and design principles to create intuitive, accessible, and consistent user experiences across apple platforms.',
  },

  // visual effects
  {
    keywords: ['gradients', 'materials', 'visual', 'effects'],
    title: 'Materials & Visual Effects',
    platform: 'universal',
    category: 'color-and-materials',
    url: 'https://developer.apple.com/design/human-interface-guidelines/materials',
    snippet:
      'use system materials and visual effects thoughtfully to create depth and hierarchy whilst maintaining clarity and performance.',
  },

  // input and controls
  {
    keywords: ['input', 'field', 'form', 'text'],
    title: 'Text Fields',
    platform: 'iOS',
    category: 'selection-and-input',
    url: 'https://developer.apple.com/design/human-interface-guidelines/text-fields',
    snippet:
      'a text field is a rectangular area in which people enter or edit small, specific pieces of text.',
  },
  {
    keywords: ['picker', 'select', 'choose'],
    title: 'Pickers',
    platform: 'iOS',
    category: 'selection-and-input',
    url: 'https://developer.apple.com/design/human-interface-guidelines/pickers',
    snippet:
      'a picker displays one or more scrollable lists of distinct values that people can choose from.',
  },

  // platform specific
  {
    keywords: ['vision', 'visionos', 'spatial', 'immersive', 'ar', 'vr'],
    title: 'Designing for visionOS',
    platform: 'visionOS',
    category: 'foundations',
    url: 'https://developer.apple.com/design/human-interface-guidelines/designing-for-visionos',
    snippet:
      'visionos brings together digital and physical worlds, creating opportunities for new types of immersive experiences.',
  },
  {
    keywords: ['watch', 'watchos', 'complication', 'crown'],
    title: 'Designing for watchOS',
    platform: 'watchOS',
    category: 'foundations',
    url: 'https://developer.apple.com/design/human-interface-guidelines/designing-for-watchos',
    snippet:
      'apple watch is a highly personal device that people wear on their wrist, making it instantly accessible.',
  },
];

/**
 * get fallback results when primary content sources are unavailable
 */
export function getFallbackResults(
  query: string,
  platform?: ApplePlatform,
  limit: number = 3
): SearchResult[] {
  const queryLower = query.toLowerCase();
  const results: SearchResult[] = [];

  FALLBACK_DATA.forEach((item, index) => {
    let relevanceScore = 0;

    // check for keyword matches
    const hasKeywordMatch = item.keywords.some(
      (keyword) => queryLower.includes(keyword) || keyword.includes(queryLower)
    );
    if (hasKeywordMatch) {
      relevanceScore = 1.0;
    }

    // check title match
    if (item.title.toLowerCase().includes(queryLower)) {
      relevanceScore = Math.max(relevanceScore, 0.8);
    }

    // apply platform filter
    if (
      platform &&
      platform !== 'universal' &&
      item.platform !== platform &&
      item.platform !== 'universal'
    ) {
      return;
    }

    if (relevanceScore > 0) {
      results.push({
        id: `fallback-${index}`,
        title: item.title,
        url: item.url,
        platform: item.platform as ApplePlatform,
        relevanceScore,
        content: item.snippet,
        type: 'guideline' as const,
      });
    }
  });

  // sort by relevance score and return top results
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
}
