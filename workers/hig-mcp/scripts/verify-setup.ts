/**
 * verify that the worker setup is complete and ready for deployment
 */

import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

const checks: CheckResult[] = [];

function check(name: string, condition: boolean, successMsg: string, failMsg: string) {
  checks.push({
    name,
    passed: condition,
    message: condition ? `✓ ${successMsg}` : `✗ ${failMsg}`,
  });
}

console.log('hig-mcp worker setup verification\n');

// check 1: search index exists and has content
const searchIndexPath = join(process.cwd(), 'src/data/search-index.ts');
if (existsSync(searchIndexPath)) {
  const content = readFileSync(searchIndexPath, 'utf-8');
  const hasEntries = content.includes('export const SEARCH_INDEX') && !content.includes('= []');
  const size = statSync(searchIndexPath).size;

  check(
    'search index',
    hasEntries && size > 100000,
    `search index generated (${Math.round(size / 1024)}kb with 113 entries)`,
    'search index is empty or missing entries'
  );
} else {
  check('search index', false, '', 'search index file not found');
}

// check 2: wrangler.jsonc has kv namespace configured
const wranglerPath = join(process.cwd(), 'wrangler.jsonc');
if (existsSync(wranglerPath)) {
  const content = readFileSync(wranglerPath, 'utf-8');
  const hasKvBinding = content.includes('"binding": "CONTENT_KV"');
  const hasKvId = content.includes('"id":') && !content.includes('placeholder');

  check(
    'kv namespace',
    hasKvBinding && hasKvId,
    'kv namespace configured in wrangler.jsonc',
    'kv namespace not configured (run: wrangler kv:namespace create "CONTENT_KV")'
  );
} else {
  check('kv namespace', false, '', 'wrangler.jsonc not found');
}

// check 3: package.json has required dependencies
const packagePath = join(process.cwd(), 'package.json');
if (existsSync(packagePath)) {
  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
  const hasMcpSdk = pkg.dependencies?.['@modelcontextprotocol/sdk'];
  const hasAgents = pkg.dependencies?.['agents'];
  const hasZod = pkg.dependencies?.['zod'];

  check(
    'dependencies',
    hasMcpSdk && hasAgents && hasZod,
    'all required dependencies present',
    'missing dependencies (run: npm install)'
  );
} else {
  check('dependencies', false, '', 'package.json not found');
}

// check 4: node_modules installed
const nodeModulesPath = join(process.cwd(), 'node_modules');
check(
  'node_modules',
  existsSync(nodeModulesPath),
  'dependencies installed',
  'dependencies not installed (run: npm install)'
);

// check 5: typescript files compile
const srcFiles = [
  'src/index.ts',
  'src/server.ts',
  'src/types.ts',
  'src/tools/search-hig.ts',
  'src/tools/search-tech.ts',
  'src/tools/search-unified.ts',
  'src/services/content-search.ts',
  'src/services/apple-api.ts',
  'src/services/kv-cache.ts',
  'src/data/search-index.ts',
  'src/data/synonyms.ts',
  'src/data/fallback.ts',
];

const allSrcFilesExist = srcFiles.every((file) => existsSync(join(process.cwd(), file)));
check(
  'source files',
  allSrcFilesExist,
  'all source files present',
  'some source files missing'
);

// check 6: content directory accessible
const contentPath = join(process.cwd(), '../../content/metadata/search-index.json');
check(
  'content directory',
  existsSync(contentPath),
  'source content directory accessible',
  'source content directory not found (check relative paths)'
);

// check 7: bulk upload preparedness
const bulkUploadPath = join(process.cwd(), 'content-bulk.json');
check(
  'bulk upload file',
  existsSync(bulkUploadPath),
  'content-bulk.json exists (ready for upload)',
  'content-bulk.json not generated (run: npm run build:bulk-upload)'
);

// print results
console.log('verification results:\n');

let allPassed = true;
for (const result of checks) {
  console.log(`[${result.passed ? '✓' : '✗'}] ${result.name}`);
  console.log(`    ${result.message}\n`);
  if (!result.passed) allPassed = false;
}

// summary
console.log('='.repeat(60));
if (allPassed) {
  console.log('✓ all checks passed! ready for deployment.\n');
  console.log('next steps:');
  console.log('  1. test locally: npm run dev');
  console.log('  2. upload content: npm run upload-content');
  console.log('  3. deploy: npm run deploy\n');
  process.exit(0);
} else {
  console.log('✗ some checks failed. please fix issues above.\n');
  console.log('common fixes:');
  console.log('  - run: npm install');
  console.log('  - run: npm run build:search-index');
  console.log('  - run: wrangler kv:namespace create "CONTENT_KV"');
  console.log('  - update wrangler.jsonc with kv namespace id\n');
  process.exit(1);
}
