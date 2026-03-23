# deployment guide

step-by-step guide to deploy hig-mcp cloudflare worker.

## prerequisites

- cloudflare account with workers enabled
- wrangler cli installed (`npm install -g wrangler`)
- authenticated with wrangler (`wrangler login`)

## step 1: create kv namespace

create the kv namespace for content storage:

```bash
wrangler kv:namespace create "CONTENT_KV"
```

you'll get output like:

```
add the following to your configuration file in your kv_namespaces array:
{ binding = "CONTENT_KV", id = "abc123def456" }
```

copy the id and update `wrangler.jsonc`:

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "CONTENT_KV",
      "id": "abc123def456"  // <- paste your id here
    }
  ]
}
```

## step 2: install dependencies

```bash
cd workers/hig-mcp
npm install
```

## step 3: generate search index

the search index must be generated before deployment:

```bash
npm run build:search-index
```

this creates `src/data/search-index.ts` with all 113 apple hig sections inlined.

verify the file was created:

```bash
ls -lh src/data/search-index.ts
# should show ~132kb file
```

## step 4: upload content to kv

upload all markdown files to kv storage:

```bash
# option 1: use bulk upload script (recommended)
npm run upload-content

# option 2: manual upload with wrangler
# for each markdown file in content/:
wrangler kv:key put "content:ios:buttons.md" \
  --path="../../content/platforms/ios/buttons.md" \
  --binding=CONTENT_KV
```

for bulk upload, create a json file with all key-value pairs:

```json
[
  {
    "key": "content:ios:buttons.md",
    "value": "markdown content here..."
  }
]
```

then upload:

```bash
wrangler kv:bulk put content-bulk.json --binding=CONTENT_KV
```

## step 5: test locally

test the worker locally before deploying:

```bash
npm run dev
```

the worker will be available at `http://localhost:8787`.

test health endpoint:

```bash
curl http://localhost:8787/health
```

test mcp endpoint (requires mcp client):

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHttpTransport } from '@modelcontextprotocol/sdk/client/streamable-http.js';

const client = new Client({
  name: 'test-client',
  version: '1.0.0',
});

await client.connect(
  new StreamableHttpTransport({
    url: 'http://localhost:8787/mcp',
  })
);

const result = await client.callTool({
  name: 'search_human_interface_guidelines',
  arguments: {
    query: 'buttons',
    platform: 'iOS',
  },
});

console.log(result);
```

## step 6: deploy to production

deploy the worker:

```bash
npm run deploy
```

wrangler will output the worker url:

```
published hig-mcp (0.12 sec)
  https://hig-mcp.your-account.workers.dev
```

## step 7: verify deployment

test the deployed worker:

```bash
# health check
curl https://hig-mcp.your-account.workers.dev/health

# should return:
# {"status":"ok","timestamp":"2026-02-27T...","service":"hig-mcp"}
```

test with mcp client by changing the url to your production endpoint.

## step 8: configure custom domain (optional)

add a custom domain in cloudflare dashboard:

1. go to workers & pages > hig-mcp
2. click "triggers" tab
3. add custom domain: `hig-mcp.yourdomain.com`
4. cloudflare will automatically provision ssl certificate

update `wrangler.jsonc`:

```jsonc
{
  "routes": [
    {
      "pattern": "hig-mcp.yourdomain.com/mcp",
      "zone_name": "yourdomain.com"
    }
  ]
}
```

## monitoring

### cloudflare dashboard

monitor your worker in the cloudflare dashboard:

- workers & pages > hig-mcp > metrics
- view requests, errors, cpu time, and kv operations

### real-time logs

stream worker logs:

```bash
wrangler tail
```

filter for errors only:

```bash
wrangler tail --status error
```

### kv storage usage

check kv namespace usage:

```bash
wrangler kv:key list --binding=CONTENT_KV
```

## updating content

when apple updates their hig content:

1. update source content in `content/` directory
2. regenerate search index:
   ```bash
   npm run build:search-index
   ```
3. re-upload content to kv:
   ```bash
   npm run upload-content
   ```
4. deploy updated worker:
   ```bash
   npm run deploy
   ```

## troubleshooting

### deployment fails

**error: kv namespace not found**

ensure you created the kv namespace and updated `wrangler.jsonc` with the correct id.

**error: authentication required**

run `wrangler login` to authenticate.

### search returns no results

**check search index**

verify `src/data/search-index.ts` exists and has 113 entries:

```bash
grep -c '"id":' src/data/search-index.ts
# should output: 113
```

**check kv content**

verify content was uploaded:

```bash
wrangler kv:key list --binding=CONTENT_KV | head
```

### api timeouts

if apple api searches timeout frequently:

- try more specific queries
- specify framework parameter
- check apple developer network status

### worker exceeds cpu time

if worker consistently exceeds cpu limits:

- reduce search index size by filtering less relevant content
- optimise relevance scoring algorithms
- increase caching ttl

## cost estimation

cloudflare workers free tier includes:

- 100,000 requests/day
- 10ms cpu time per request
- 1gb kv storage
- 1,000 kv reads/day
- 1,000 kv writes/day

for typical usage:

- 1,000 searches/day = well within free tier
- kv storage: ~5mb (113 markdown files)
- kv reads: ~3,000/day (3 per search for content)

expected cost: **free** for most usage patterns

## security notes

- worker creates new mcp server per request (mcp sdk 1.26.0 security requirement)
- no authentication on public endpoints (add cloudflare access if needed)
- rate limiting via cloudflare (10,000 req/min default)
- all apple api calls use 15-second timeout

## support

for issues or questions:

- check cloudflare workers documentation
- review cloudflare dashboard logs
- test locally with `npm run dev`
- check kv namespace contents
