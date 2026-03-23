/**
 * generate inline search index typescript file
 * converts content/metadata/search-index.json into inline typescript constant
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * generate search index typescript file
 */
function generateSearchIndex() {
  console.log('generating inline search index...\n');

  // read source search index json
  const sourceFile = join(process.cwd(), '../../content/metadata/search-index.json');
  const targetFile = join(process.cwd(), 'src/data/search-index.ts');

  console.log(`reading source: ${sourceFile}`);

  let searchIndex: any[];
  try {
    const content = readFileSync(sourceFile, 'utf-8');
    searchIndex = JSON.parse(content);
  } catch (error) {
    console.error(`failed to read search index: ${error}`);
    process.exit(1);
  }

  console.log(`found ${searchIndex.length} index entries`);
  console.log(`source size: ${Math.round(Buffer.byteLength(JSON.stringify(searchIndex), 'utf-8') / 1024)}kb\n`);

  // generate typescript file
  const tsContent = `/**
 * inline search index for fast content lookup
 * generated from content/metadata/search-index.json
 * approximately ${Math.round(Buffer.byteLength(JSON.stringify(searchIndex), 'utf-8') / 1024)}kb of indexed apple hig content
 *
 * generated: ${new Date().toISOString()}
 */

import type { SearchIndexEntry } from '../types';

export const SEARCH_INDEX: SearchIndexEntry[] = ${JSON.stringify(searchIndex, null, 2)};
`;

  console.log(`writing target: ${targetFile}`);
  writeFileSync(targetFile, tsContent, 'utf-8');

  const outputSize = Buffer.byteLength(tsContent, 'utf-8');
  console.log(`output size: ${Math.round(outputSize / 1024)}kb`);
  console.log('\nsearch index generated successfully');
}

// run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateSearchIndex();
}
