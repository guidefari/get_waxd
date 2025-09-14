# Web Scraper with SST

An async web scraping system built with SST, AWS Lambda, DynamoDB, and Playwright. Designed for testing websites with a pluggable architecture that supports multiple sites.

## Features

- ⚡ Async job processing with AWS SQS
- 🏗️ Pluggable scraper architecture
- 💾 Data storage in DynamoDB
- 🎭 Playwright-powered web scraping
- 🔄 Automatic retry and error handling
- 📊 Support for paginated content

## Setup

1. **Install dependencies:**
```bash
bun install
```

2. **Install Playwright browsers:**
```bash
bun run install-browsers
```

3. **Test scraper locally:**
```bash
bun run test-scraper
```

## Deployment

1. **Deploy to AWS:**
```bash
bun run deploy
```

2. **Start development mode:**
```bash
bun run dev
```

## Currently Supported Sites

- **Mr Vinyl** (`mr-vinyl`): Electronic/EDM products from mrvinyl.co.za (44 pages)

## Adding New Sites

1. Create a new scraper class extending `BaseScraper` in `src/scrapers/`
2. Add the configuration method `getConfiguration()`
3. Register it in `ScraperFactory`

Example:
```typescript
export class NewSiteScraper extends BaseScraper {
  static getConfiguration(): SiteConfiguration {
    return {
      id: "new-site",
      name: "New Site",
      baseUrl: "https://example.com",
      scrapeConfig: {
        selectors: { /* CSS selectors */ },
        pagination: { /* pagination config */ }
      }
    };
  }
}
```

## API Usage

**Trigger scraping for a site:**
```bash
curl -X POST https://your-api-url/trigger-scrape \
  -H "Content-Type: application/json" \
  -d '{"siteId": "mr-vinyl"}'
```

**Scrape a single page:**
```bash
curl -X POST https://your-api-url/scrape-page \
  -H "Content-Type: application/json" \
  -d '{"siteId": "mr-vinyl", "url": "https://..."}'
```
