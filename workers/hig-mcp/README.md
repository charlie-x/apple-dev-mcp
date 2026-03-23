# hig-mcp cloudflare worker

apple human interface guidelines mcp server as a cloudflare worker using streamable http transport.

## overview

this is a cloudflare worker implementation of the apple dev mcp server that provides complete apple development guidance through three tools:

1. **search_human_interface_guidelines** - search design principles from apple hig
2. **search_technical_documentation** - search apple api documentation
3. **search_unified** - combined search across both design and technical content

## architecture

- **transport**: streamable http via `agents/mcp` package
- **storage**: kv namespace for markdown content (113+ sections)
- **search**: inline search index (132kb) for instant lookups
- **caching**: kv-based caching with ttl for api responses

## setup

### 1. install dependencies

```bash
npm install
```

### 2. create kv namespace

```bash
wrangler kv:namespace create "CONTENT_KV"
```

copy the namespace id and update `wrangler.jsonc`:

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "CONTENT_KV",
      "id": "your-namespace-id-here"
    }
  ]
}
```

### 3. generate search index

```bash
npm run build:search-index
```

this converts `content/metadata/search-index.json` into an inline typescript constant.

### 4. upload content to kv

```bash
npm run upload-content
```

this uploads all markdown files from the content directory to kv storage with keys like `content:ios:buttons.md`.

### 5. deploy worker

```bash
npm run deploy
```

## development

run locally with wrangler dev:

```bash
npm run dev
```

the worker will be available at `http://localhost:8787`.

## endpoints

- `GET /health` - health check endpoint
- `POST /mcp` - mcp streamable http endpoint

## usage

### connect via mcp client

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHttpTransport } from '@modelcontextprotocol/sdk/client/streamable-http.js';

const client = new Client({
  name: 'my-client',
  version: '1.0.0',
});

await client.connect(
  new StreamableHttpTransport({
    url: 'https://hig-mcp.your-account.workers.dev/mcp',
  })
);

// search human interface guidelines
const result = await client.callTool({
  name: 'search_human_interface_guidelines',
  arguments: {
    query: 'buttons',
    platform: 'iOS',
  },
});

console.log(result);
```

### call tools

#### search_human_interface_guidelines

```json
{
  "name": "search_human_interface_guidelines",
  "arguments": {
    "query": "buttons accessibility",
    "platform": "iOS"
  }
}
```

#### search_technical_documentation

```json
{
  "name": "search_technical_documentation",
  "arguments": {
    "query": "UIButton",
    "framework": "UIKit",
    "platform": "iOS"
  }
}
```

#### search_unified

```json
{
  "name": "search_unified",
  "arguments": {
    "query": "navigation",
    "platform": "iOS"
  }
}
```

## project structure

```
workers/hig-mcp/
├── src/
│   ├── index.ts              # worker entry point
│   ├── server.ts             # mcp server configuration
│   ├── types.ts              # type definitions
│   ├── tools/
│   │   ├── search-hig.ts     # search_human_interface_guidelines
│   │   ├── search-tech.ts    # search_technical_documentation
│   │   └── search-unified.ts # search_unified
│   ├── services/
│   │   ├── content-search.ts # static content search engine
│   │   ├── apple-api.ts      # apple api client (fetch-based)
│   │   └── kv-cache.ts       # kv caching utilities
│   └── data/
│       ├── search-index.ts   # inline search index
│       ├── synonyms.ts       # synonym mappings
│       └── fallback.ts       # hardcoded fallback content
├── scripts/
│   ├── generate-search-index.ts # generate inline index
│   └── upload-content.ts     # upload markdown to kv
├── wrangler.jsonc
├── package.json
└── tsconfig.json
```

## key features

### static content architecture
- 113+ pre-processed apple hig sections
- inline search index for instant responses
- kv storage for full markdown content
- graceful degradation with fallback content

### enhanced search
- multi-factor relevance scoring
- synonym expansion for better matches
- concept-based boosting
- platform and category filtering

### api integration
- direct apple api access for technical docs
- intelligent framework targeting
- 15-second timeout protection
- kv caching with 10-minute ttl

### performance
- instant responses via inline search index
- unlimited concurrency from kv reads
- efficient memory usage (~132kb index)
- no cold start delays for search

## configuration

### environment variables

none required - all configuration via `wrangler.jsonc`.

### kv namespace

the worker requires one kv namespace binding named `CONTENT_KV` for storing markdown content.

### compatibility

- compatibility date: 2026-02-01
- compatibility flags: nodejs_compat
- requires wrangler 3.0+

## maintenance

### updating content

1. update source content in `content/` directory
2. regenerate search index: `npm run build:search-index`
3. re-upload content: `npm run upload-content`
4. deploy: `npm run deploy`

### monitoring

use cloudflare dashboard to monitor:
- request counts and errors
- kv storage usage
- worker cpu time
- cache hit rates

## troubleshooting

### search returns no results

1. check if search index is generated: verify `src/data/search-index.ts` has entries
2. check kv namespace: ensure content is uploaded
3. check kv bindings: verify `CONTENT_KV` binding is correct

### api timeouts

the apple api has a 15-second timeout. if searches consistently timeout:
- try more specific queries
- specify framework parameter to reduce api calls
- check apple developer network status

### worker errors

check cloudflare logs:
```bash
wrangler tail
```

## licence

mit
