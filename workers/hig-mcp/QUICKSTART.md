# quick start guide

get hig-mcp worker running in 5 minutes.

## 1. install

```bash
cd workers/hig-mcp
npm install
```

## 2. authenticate

```bash
wrangler login
```

## 3. create kv namespace

```bash
wrangler kv:namespace create "CONTENT_KV"
```

copy the namespace id from output and update `wrangler.jsonc`:

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "CONTENT_KV",
      "id": "paste-your-id-here"
    }
  ]
}
```

## 4. generate search index

```bash
npm run build:search-index
```

## 5. upload content

```bash
npm run upload-content
```

this will:
- generate `content-bulk.json` with all markdown files
- upload to kv using `wrangler kv:bulk put`

## 6. test locally

```bash
npm run dev
```

test health check:

```bash
curl http://localhost:8787/health
```

## 7. deploy

```bash
npm run deploy
```

## 8. test production

```bash
curl https://hig-mcp.your-account.workers.dev/health
```

## usage example

connect with mcp client:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHttpTransport } from '@modelcontextprotocol/sdk/client/streamable-http.js';

const client = new Client({
  name: 'my-app',
  version: '1.0.0',
});

await client.connect(
  new StreamableHttpTransport({
    url: 'https://hig-mcp.your-account.workers.dev/mcp',
  })
);

// search hig
const result = await client.callTool({
  name: 'search_human_interface_guidelines',
  arguments: {
    query: 'navigation buttons',
    platform: 'iOS',
  },
});

console.log(result);
```

## available tools

1. **search_human_interface_guidelines** - search apple hig for design principles
   - parameters: `query` (required), `platform` (optional)

2. **search_technical_documentation** - search apple api docs
   - parameters: `query` (required), `framework` (optional), `platform` (optional)

3. **search_unified** - combined search across design and technical
   - parameters: `query` (required), `platform` (optional)

## next steps

- read [README.md](README.md) for detailed architecture
- read [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
- configure custom domain in cloudflare dashboard
- set up monitoring and alerts

## troubleshooting

**search returns no results**
- run `npm run build:search-index` to ensure index is generated
- check kv content: `wrangler kv:key list --binding=CONTENT_KV`

**deployment fails**
- verify kv namespace id in `wrangler.jsonc`
- ensure authenticated: `wrangler whoami`

**api timeout errors**
- apple api has 15s timeout
- try more specific queries or specify framework parameter

## support

- cloudflare workers docs: https://developers.cloudflare.com/workers/
- mcp sdk docs: https://github.com/modelcontextprotocol/sdk
- apple dev docs: https://developer.apple.com/documentation/
