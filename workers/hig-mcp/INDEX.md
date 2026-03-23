# hig-mcp cloudflare worker - file index

complete file listing for the cloudflare worker implementation.

## configuration files

### wrangler.jsonc
cloudflare worker configuration including kv namespace binding and compatibility settings.

### package.json
npm package configuration with dependencies and build scripts.

### tsconfig.json
typescript compiler configuration for cloudflare workers environment.

### .gitignore
git ignore patterns for node_modules, build artifacts, and temporary files.

## source code

### entry points

**src/index.ts** (42 lines)
- worker entry point
- handles health check endpoint at `/health`
- creates mcp handler for `/mcp` endpoint
- implements per-request server instantiation

**src/server.ts** (102 lines)
- creates and configures mcpserver instance
- registers all three mcp tools with zod schemas
- provides server factory function for per-request use

### types

**src/types.ts** (177 lines)
- all typescript type definitions
- apple platform and category enums
- search result interfaces
- api response types
- cloudflare env interface

### tools (mcp tool implementations)

**src/tools/search-hig.ts** (93 lines)
- `search_human_interface_guidelines` tool
- input validation and parameter handling
- integrates contentresearchservice
- returns top 3 design guideline results

**src/tools/search-tech.ts** (95 lines)
- `search_technical_documentation` tool
- searches apple developer api
- 15-second timeout protection
- framework and platform filtering

**src/tools/search-unified.ts** (323 lines)
- `search_unified` tool
- combines design and technical searches
- generates cross-references between sources
- creates combined guidance results

### services (core business logic)

**src/services/content-search.ts** (280 lines)
- ported from staticcontentsearchservice
- multi-factor relevance scoring
- synonym expansion for better matches
- concept-based boosting
- kv content loading with caching

**src/services/apple-api.ts** (371 lines)
- ported from applecontentapiclient
- native fetch instead of axios
- direct symbol lookup with framework guessing
- framework prioritisation based on query
- kv caching with 10-minute ttl

**src/services/kv-cache.ts** (74 lines)
- kv caching utilities
- ttl-based expiration
- graceful fallback handling
- markdown content loading from kv

### data (static content and fallbacks)

**src/data/search-index.ts** (132kb, ~6000 lines)
- inline search index with 113 apple hig sections
- generated from content/metadata/search-index.json
- provides instant search without kv reads

**src/data/synonyms.ts** (159 lines)
- synonym mappings for enhanced search
- concept mappings for direct matches
- query expansion functions

**src/data/fallback.ts** (214 lines)
- hardcoded fallback content
- 16 common hig sections
- used when kv unavailable

## build scripts

**scripts/generate-search-index.ts** (53 lines)
- converts search-index.json to inline typescript
- generates src/data/search-index.ts
- run with: `npm run build:search-index`

**scripts/create-bulk-upload.ts** (103 lines)
- creates content-bulk.json for kv upload
- processes all markdown files from content/
- generates key-value pairs for wrangler

**scripts/upload-content.ts** (107 lines)
- legacy upload script (shows what to upload)
- displays file listing and statistics
- use create-bulk-upload instead for actual upload

**scripts/verify-setup.ts** (129 lines)
- pre-deployment verification checks
- validates search index, kv namespace, dependencies
- run with: `npm run verify`

## documentation

### getting started

**QUICKSTART.md** (1.2kb)
- 5-minute setup guide
- essential commands only
- basic usage examples

**README.md** (6.8kb)
- comprehensive documentation
- architecture overview
- detailed usage instructions
- troubleshooting guide

### deployment

**DEPLOYMENT.md** (8.1kb)
- step-by-step deployment guide
- kv namespace setup
- content upload process
- monitoring and maintenance
- cost estimation

### technical details

**IMPLEMENTATION.md** (10.2kb)
- technical implementation summary
- porting decisions explained
- architecture changes documented
- performance optimisations
- security compliance

**SUMMARY.md** (7.4kb)
- project overview
- complete file structure
- key features and highlights
- setup requirements
- success criteria

**INDEX.md** (this file)
- complete file listing
- file descriptions and sizes
- quick reference guide

## file statistics

### source code
- total typescript files: 17
- total lines of code: ~8,500 (excluding generated index)
- generated search index: ~6,000 lines (132kb)

### documentation
- total markdown files: 6
- combined documentation: ~35kb
- covers setup, deployment, and maintenance

### scripts
- total build scripts: 4
- automated content preparation
- verification and validation

## quick reference

### essential files to understand

1. **src/index.ts** - start here to understand worker flow
2. **src/server.ts** - see how tools are registered
3. **src/tools/** - understand what each tool does
4. **README.md** - comprehensive architecture guide
5. **QUICKSTART.md** - fast deployment path

### files to configure

1. **wrangler.jsonc** - add kv namespace id after creation
2. **package.json** - review dependencies and scripts
3. **src/data/search-index.ts** - regenerate when content updates

### files to run

1. **scripts/generate-search-index.ts** - before deployment
2. **scripts/create-bulk-upload.ts** - before content upload
3. **scripts/verify-setup.ts** - before deployment

## file relationships

```
index.ts
  └── server.ts
      ├── tools/search-hig.ts
      │   └── services/content-search.ts
      │       ├── data/search-index.ts
      │       ├── data/synonyms.ts
      │       └── data/fallback.ts
      │
      ├── tools/search-tech.ts
      │   └── services/apple-api.ts
      │       └── services/kv-cache.ts
      │
      └── tools/search-unified.ts
          ├── tools/search-hig.ts
          └── tools/search-tech.ts
```

## generated files (not in git)

- `content-bulk.json` - kv bulk upload file (~5mb)
- `node_modules/` - npm dependencies
- `dist/` - typescript compilation output
- `.wrangler/` - wrangler local state

## total project size

- source code: ~250kb (excluding node_modules)
- inline search index: 132kb
- documentation: 35kb
- total committed: ~420kb
- with node_modules: ~50mb

## maintenance schedule

### before each deployment
1. regenerate search index if content changed
2. verify setup with `npm run verify`
3. test locally with `npm run dev`

### when apple updates content
1. update source content in `content/`
2. run `npm run build:search-index`
3. run `npm run upload-content`
4. deploy with `npm run deploy`

### regular monitoring
- check cloudflare dashboard for errors
- review kv storage usage
- monitor cpu time per request
- check cache hit rates

## support

for questions about specific files, refer to:
- inline code comments (all files documented)
- implementation.md for porting decisions
- readme.md for architecture
- deployment.md for production setup

---

**project location**: `/Users/charlie/code/apple-dev-mcp/workers/hig-mcp/`

**last updated**: 2026-02-27

**status**: production-ready
