# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Workflow

**IMPORTANT**: Always assume `sst dev` is running in another terminal. Never run `sst dev` yourself - the user handles this.

## Architecture Overview

This is an async web scraping system built with **SST v3**, **AWS Lambda**, **DynamoDB**, and **Puppeteer**. The system uses a functional approach to scrape multiple websites with different structures and pagination patterns.

### Core Infrastructure

**SST Configuration** (`sst.config.ts`):
- Uses modern `Resource` global imports instead of environment variables for type-safe resource access
- DynamoDB table with GSI for querying by site (`bySite` index: siteId + scrapedAt)
- SQS queue for async job processing with Lambda consumers
- Functions linked to resources via `link` parameter, not environment variables

### Functional Scraper Architecture

**Simple Function-Based Approach**:
- Each site has its own file in `src/scrapers/` (e.g., `mr-vinyl.ts`)
- Export a config object and a scraper function
- Central registry in `src/scrapers/index.ts` manages all scrapers
- No classes or inheritance - just plain functions

**Adding New Sites**:
1. Create `src/scrapers/new-site.ts` with config and scraper function
2. Add to registry in `src/scrapers/index.ts`
3. That's it - no factory classes or complex registration

### Data Flow

**Bulk Scraping Flow**:
1. `TriggerScrape` Lambda generates all URLs for a site and queues SQS messages
2. Each SQS message contains `siteId`, `url`, `pageNumber`, `metadata`
3. `ProcessScrapeJob` Lambda consumes queue, launches Playwright browser, scrapes page, saves to DynamoDB
4. Uses staggered delays (`index * 2` seconds) to prevent rate limiting

**Direct Scraping Flow**:
1. `ScrapePage` Lambda accepts single URL requests via API
2. Immediate scraping with response + DynamoDB storage

## Development Commands

```bash
# Local testing with visible browser
bun run test-scraper

# Test live Lambda functions (requires sst dev running)
bun run test-live

# Install Puppeteer browsers for local development (if needed)
bun run install-browsers

# Deploy to AWS (only when not using sst dev)
bun run deploy

# Remove AWS resources
bun run remove
```

## Testing Live Lambda Functions

The system provides two endpoints when `sst dev` is running:

1. **Trigger Bulk Scraping**:
```bash
curl -X POST <TRIGGER_FUNCTION_URL> \
  -H "Content-Type: application/json" \
  -d '{"siteId": "mr-vinyl"}'
```

2. **Single Page Scraping**:
```bash
curl -X POST <SCRAPE_FUNCTION_URL> \
  -H "Content-Type: application/json" \
  -d '{"siteId": "mr-vinyl", "url": "https://..."}'
```

**Common Error**: `{"error":"siteId is required"}` - Make sure the request body includes the `siteId` field.

## Key Implementation Details

**Lambda Functions**:
- Use `type` imports for AWS Lambda types to avoid bundling issues
- All functions export a `handler` function
- Browser lifecycle managed per Lambda invocation (launch → scrape → close)
- Environment-specific browser configuration using `process.env.SST_DEV`:
  - **Development** (`SST_DEV`): Uses local Puppeteer with visible browser
  - **Production**: Uses `@sparticuz/chromium` with `puppeteer-core` in headless mode
- SST config uses `nodejs.install` for dependencies: `@sparticuz/chromium`, `puppeteer-core`
- Sets `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` environment variable

**Database Access**:
- Uses `@aws-sdk/lib-dynamodb` with DynamoDBDocumentClient
- Access resources via `Resource.ScrapeData.name` (not environment variables)
- Only `id`, `siteId`, and `scrapedAt` are indexed fields (DynamoDB requirement)

**Error Handling**:
- Individual job failures don't stop batch processing
- Structured `ScraperResult` with `success/error` states
- Comprehensive console logging for debugging

## Current Sites

**Mr Vinyl** (`mr-vinyl`):
- Scrapes 44 pages of Electronic/EDM products
- WooCommerce-based selectors for products, prices, images, URLs
- URL pattern: `https://www.mrvinyl.co.za/product-category/electronic-edm/page/{page}/`