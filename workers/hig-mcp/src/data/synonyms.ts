/**
 * synonym mappings for enhanced search relevance
 */

export const SYNONYM_MAP = new Map<string, string[]>([
  // basic search and guidelines
  ['search', ['searching', 'search field', 'search bar', 'find', 'lookup']],
  ['searching', ['search', 'search field', 'search bar', 'find', 'lookup']],
  ['guidelines', ['best practices', 'recommendations', 'guidance', 'standards']],
  ['best practices', ['guidelines', 'recommendations', 'guidance', 'standards']],

  // interactive elements
  ['button', ['btn', 'tap', 'click', 'press', 'action', 'buttons']],
  ['toggle', ['switch', 'toggles', 'on off', 'binary control']],
  ['switch', ['toggle', 'toggles', 'on off', 'binary control']],
  ['picker', ['pickers', 'selection', 'chooser', 'selector', 'segmented picker']],
  ['slider', ['sliders', 'range', 'continuous control', 'scrubber']],

  // navigation and layout
  ['navigation', ['nav', 'navigate', 'menu', 'hierarchy', 'navigation bar']],
  ['tab', ['tabs', 'tab bar', 'tabbed', 'bottom navigation']],
  ['stack', ['stacks', 'layout', 'zstack', 'vstack', 'hstack', 'lazy stack']],

  // data presentation
  ['progress', ['progress indicator', 'loading', 'spinner', 'activity indicator']],
  ['loading', ['progress', 'spinner', 'activity', 'progress indicator']],
  ['chart', ['charts', 'graph', 'data visualization', 'charting']],
  ['gauge', ['gauges', 'meter', 'measurement', 'dial']],

  // modal and overlays
  ['alert', ['alerts', 'dialog', 'modal alert', 'system alert']],
  ['action sheet', ['action sheets', 'bottom sheet', 'modal choices']],
  ['popover', ['popovers', 'popup', 'contextual menu', 'callout']],
  ['sheet', ['sheets', 'modal', 'presentation']],

  // text and input
  ['text field', ['text fields', 'input', 'text input', 'form field']],
  ['text', ['text field', 'text view', 'label', 'typography']],

  // platform concepts
  ['notification', ['notifications', 'push notification', 'alerts', 'system notification']],
  ['onboarding', ['welcome', 'introduction', 'getting started', 'first run']],
  ['rating', ['ratings', 'review', 'stars', 'feedback']],

  // technical concepts
  ['swiftui', ['swift ui', 'declarative ui', 'view', 'modifier']],
  ['uikit', ['ui kit', 'imperative ui', 'view controller']],
  ['view', ['views', 'interface', 'ui element', 'component']],
  ['task', ['async', 'concurrency', 'background', 'operation']],

  // general design
  ['interface', ['ui', 'user interface', 'design', 'component']],
  ['component', ['element', 'control', 'widget', 'interface']],
  ['pattern', ['patterns', 'design pattern', 'interaction']],
  ['accessibility', ['a11y', 'voiceover', 'accessible', 'inclusive']],
  ['design', ['interface', 'ui', 'visual', 'aesthetic']],
]);

/**
 * expand query terms with synonyms for better matching
 */
export function expandQueryWithSynonyms(query: string): string[] {
  const terms = query.split(/\s+/).filter((term) => term.length > 1);
  const expanded = new Set([query]); // always include original query

  for (const term of terms) {
    const synonyms = SYNONYM_MAP.get(term);
    if (synonyms) {
      synonyms.forEach((synonym) => expanded.add(synonym));
    }
  }

  return Array.from(expanded);
}

/**
 * concept mappings for direct matches
 */
export const CONCEPT_MAPPINGS = new Map<string, string>([
  // exact plurals and variations
  ['alert', 'alerts'],
  ['alerts', 'alerts'],
  ['action sheet', 'action sheets'],
  ['action sheets', 'action sheets'],
  ['picker', 'pickers'],
  ['pickers', 'pickers'],
  ['progress indicator', 'progress indicators'],
  ['progress indicators', 'progress indicators'],
  ['notification', 'notifications'],
  ['notifications', 'notifications'],
  ['button', 'buttons'],
  ['buttons', 'buttons'],
  ['tab', 'tab bars'],
  ['tab bar', 'tab bars'],
  ['tabs', 'tab bars'],
  ['search field', 'search fields'],
  ['search fields', 'search fields'],

  // concept variations
  ['progress', 'progress indicators'],
  ['loading', 'progress indicators'],
  ['spinner', 'progress indicators'],
  ['activity indicator', 'progress indicators'],
  ['dialog', 'alerts'],
  ['modal alert', 'alerts'],
  ['bottom sheet', 'action sheets'],
  ['selection', 'pickers'],
  ['chooser', 'pickers'],
  ['push notification', 'notifications'],
  ['system notification', 'notifications'],
]);
