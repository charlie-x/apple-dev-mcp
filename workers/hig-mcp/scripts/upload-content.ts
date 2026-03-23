/**
 * upload markdown content to kv storage
 * run this script to populate the content_kv namespace with all hig markdown files
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface UploadStats {
  filesProcessed: number;
  bytesUploaded: number;
  errors: string[];
}

/**
 * recursively find all markdown files in content directory
 */
function findMarkdownFiles(dir: string, baseDir: string = dir): Array<{ path: string; key: string }> {
  const results: Array<{ path: string; key: string }> = [];

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // recursively search subdirectories
      results.push(...findMarkdownFiles(fullPath, baseDir));
    } else if (entry.endsWith('.md')) {
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
      results.push({ path: fullPath, key });
    }
  }

  return results;
}

/**
 * upload files to kv using wrangler cli
 */
async function uploadToKV(files: Array<{ path: string; key: string }>): Promise<UploadStats> {
  const stats: UploadStats = {
    filesProcessed: 0,
    bytesUploaded: 0,
    errors: [],
  };

  console.log(`\nfound ${files.length} markdown files to upload\n`);

  for (const file of files) {
    try {
      const content = readFileSync(file.path, 'utf-8');
      const bytes = Buffer.byteLength(content, 'utf-8');

      // use wrangler kv:key put command
      // note: this requires wrangler to be installed and configured
      const command = `wrangler kv:key put "${file.key}" --path="${file.path}" --binding=CONTENT_KV`;

      console.log(`uploading: ${file.key} (${bytes} bytes)`);

      // in production, execute the command using child_process
      // for now, just show what would be uploaded
      stats.filesProcessed++;
      stats.bytesUploaded += bytes;
    } catch (error) {
      const errorMsg = `failed to process ${file.path}: ${error}`;
      console.error(errorMsg);
      stats.errors.push(errorMsg);
    }
  }

  return stats;
}

/**
 * main function
 */
async function main() {
  console.log('hig-mcp content upload script\n');

  // find content directory (adjust path as needed)
  const contentDir = join(process.cwd(), '../../content');

  console.log(`searching for markdown files in: ${contentDir}`);

  const files = findMarkdownFiles(contentDir);

  if (files.length === 0) {
    console.error('no markdown files found. check content directory path.');
    process.exit(1);
  }

  const stats = await uploadToKV(files);

  console.log('\n=== upload statistics ===');
  console.log(`files processed: ${stats.filesProcessed}`);
  console.log(`total bytes: ${stats.bytesUploaded} (${Math.round(stats.bytesUploaded / 1024)}kb)`);
  console.log(`errors: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log('\nerrors encountered:');
    stats.errors.forEach((err) => console.error(`  - ${err}`));
  }

  console.log('\nnote: this script shows what would be uploaded.');
  console.log('to actually upload, use: wrangler kv:key put for each file');
  console.log('or use: wrangler kv:bulk put with a json file');
}

// run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('fatal error:', error);
    process.exit(1);
  });
}
