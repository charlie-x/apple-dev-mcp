/**
 * type definitions for hig-mcp worker
 */

export type ApplePlatform =
  | 'iOS'
  | 'macOS'
  | 'watchOS'
  | 'tvOS'
  | 'visionOS'
  | 'universal';

export type HIGCategory =
  | 'foundations'
  | 'layout'
  | 'navigation'
  | 'presentation'
  | 'selection-and-input'
  | 'status'
  | 'system-capabilities'
  | 'visual-design'
  | 'icons-and-images'
  | 'color-and-materials'
  | 'typography'
  | 'motion'
  | 'technologies';

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  platform: ApplePlatform;
  category?: HIGCategory;
  relevanceScore: number;
  content: string;
  type: 'section' | 'component' | 'guideline';
  highlights?: string[];
}

export interface SearchIndexEntry {
  id: string;
  title: string;
  platform: string;
  category: string;
  url: string;
  filename: string;
  keywords: string[];
  snippet: string;
  quality: {
    score: number;
    length: number;
    structureScore: number;
    appleTermsScore: number;
    codeExamplesCount: number;
    imageReferencesCount: number;
    headingCount: number;
    isFallbackContent: boolean;
    extractionMethod: string;
    confidence: number;
  };
  lastUpdated: string;
  hasStructuredContent: boolean;
  hasGuidelines: boolean;
  hasExamples: boolean;
  hasSpecifications: boolean;
  conceptCount: number;
}

export interface TechnicalSearchResult {
  title: string;
  description: string;
  path: string;
  framework: string;
  symbolKind?: string;
  platforms?: string;
  url: string;
  relevanceScore: number;
  type: 'technical';
}

export interface UnifiedSearchResult {
  id: string;
  title: string;
  type: 'design' | 'technical' | 'combined';
  url: string;
  relevanceScore: number;
  snippet: string;

  designContent?: {
    platform: ApplePlatform;
    category?: HIGCategory;
    guidelines?: string[];
  };

  technicalContent?: {
    framework: string;
    symbolKind: string;
    platforms: string[];
    abstract: string;
    codeExamples: string[];
  };

  combinedGuidance?: {
    designPrinciples: string[];
    implementationSteps: string[];
    crossPlatformConsiderations: string[];
    accessibilityNotes: string[];
  };
}

export interface Technology {
  title: string;
  abstract: { text: string; type: string }[];
  url: string;
  kind: string;
  role: string;
  identifier: string;
}

export interface TopicSection {
  title: string;
  identifiers: string[];
  anchor?: string;
}

export interface FrameworkData {
  metadata: {
    title: string;
    role: string;
    platforms: any[];
  };
  abstract: { text: string; type: string }[];
  topicSections: TopicSection[];
  references: Record<string, any>;
}

export interface SymbolData {
  metadata: {
    title: string;
    symbolKind: string;
    platforms: any[];
  };
  abstract: { text: string; type: string }[];
  primaryContentSections: any[];
  topicSections: TopicSection[];
  references: Record<string, any>;
}

export interface Env {
  CONTENT_KV: KVNamespace;
}
