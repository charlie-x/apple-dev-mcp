/**
 * create bulk upload json file for kv content
 * generates a json file that can be used with: wrangler kv:bulk put
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';

interface KVEntry {
  key: string;
  value: string;
}

/**
 * recursively find all markdown files and create kv entries
 */
function createKVEntries(dir: string, baseDir: string = dir): KVEntry[] {
  const entries: KVEntry[] = [];

  const dirEntries = readdirSync(dir);
  for (const entry of dirEntries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // recursively search subdirectories
      entries.push(...createKVEntries(fullPath, baseDir));
    } else if (entry.endsWith('.md')) {
      // read file content
      const content = readFileSync(fullPath, 'utf-8');

      // extract platform and filename for kv key
      const relativePath = fullPath.replace(baseDir + '/', '');
      const parts = relativePath.split('/');

      let platform = 'universal';
      let filename = entry;

      if (parts[0] === 'platforms' && parts.length >= 3) {
        // platforms/ios/file.md -> ios:file.md
        platform = parts[1];
        filename = entry;
      } else if (parts[0] === 'universal') {
        // universal/file.md -> universal:file.md
        platform = 'universal';
        filename = entry;
      }

      const key = `content:${platform}:${filename}`;
      entries.push({ key, value: content });

      console.log(`prepared: ${key} (${content.length} bytes)`);
    }
  }

  return entries;
}

/**
 * main function
 */
function main() {
  console.log('creating bulk upload json file\n');

  // find content directory
  const contentDir = join(process.cwd(), '../../content');
  const outputFile = join(process.cwd(), 'content-bulk.json');

  console.log(`searching for markdown files in: ${contentDir}\n`);

  const entries = createKVEntries(contentDir);

  if (entries.length === 0) {
    console.error('no markdown files found. check content directory path.');
    process.exit(1);
  }

  // write bulk upload json
  console.log(`\nwriting bulk upload file: ${outputFile}`);
  writeFileSync(outputFile, JSON.stringify(entries, null, 2), 'utf-8');

  const outputSize = Buffer.byteLength(JSON.stringify(entries), 'utf-8');
  const totalContentSize = entries.reduce((sum, e) => sum + e.value.length, 0);

  console.log('\n=== summary ===');
  console.log(`total files: ${entries.length}`);
  console.log(`content size: ${Math.round(totalContentSize / 1024)}kb`);
  console.log(`json file size: ${Math.round(outputSize / 1024)}kb`);
  console.log(`\nto upload to kv, run:`);
  console.log(`  wrangler kv:bulk put content-bulk.json --binding=CONTENT_KV`);
}

// run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
