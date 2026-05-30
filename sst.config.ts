/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "get-waxd",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    // ── Existing scraper table ────────────────────────────────────────────────
    const scrapeDataTable = new sst.aws.Dynamo("ScrapeData", {
      fields: {
        id: "string",
        siteId: "string",
        scrapedAt: "string",
      },
      primaryIndex: { hashKey: "id" },
      globalIndexes: {
        bySite: { hashKey: "siteId", rangeKey: "scrapedAt" },
      },
    });

    // ── Vinyl products catalog table (dedup + new-release tracking) ───────────
    const vinylProductsTable = new sst.aws.Dynamo("VinylProducts", {
      fields: {
        productUrl: "string",
        siteId: "string",
      },
      primaryIndex: { hashKey: "productUrl" },
      globalIndexes: {
        bySite: { hashKey: "siteId" },
      },
    });

    // ── Secrets ───────────────────────────────────────────────────────────────
    const firecrawlApiKey = new sst.Secret("FirecrawlApiKey");
    const senderEmail = new sst.Secret("SenderEmail");
    const recipientEmail = new sst.Secret("RecipientEmail");

    // ── Existing queue & scrape functions ─────────────────────────────────────
    const scrapeQueue = new sst.aws.Queue("ScrapeQueue");

    const scrapeFunction = new sst.aws.Function("ScrapePage", {
      handler: "./src/functions/scrape-page.handler",
      link: [scrapeDataTable],
      timeout: "5 minutes",
      memory: "1600 MB",
      url: true,
      nodejs: {
        install: ["@sparticuz/chromium", "puppeteer-core"],
      },
      environment: {
        PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: "true",
      },
    });

    scrapeQueue.subscribe("./src/functions/process-scrape-job.handler", {
      link: [scrapeDataTable],
      memory: "1600 MB",
      timeout: "5 minutes",
      nodejs: {
        install: ["@sparticuz/chromium", "puppeteer-core"],
      },
      environment: {
        PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: "true",
      },
    });

    const triggerFunction = new sst.aws.Function("TriggerScrape", {
      handler: "./src/functions/trigger-scrape.handler",
      link: [scrapeQueue],
      url: true,
    });

    // ── New releases checker (runs every 6 hours) ─────────────────────────────
    // Preference env vars (optional — leave empty to get all genres/prices):
    //   NOTIFY_GENRES      : comma-separated genre labels, e.g. "Electronic/EDM,Hip Hop/Urban"
    //   NOTIFY_MAX_PRICE_ZAR : max price filter, e.g. "600"
    //   NOTIFY_KEYWORDS    : comma-separated keywords, e.g. "Aphex Twin,Boards of Canada"
    new sst.aws.Cron("CheckNewReleases", {
      schedule: "rate(6 hours)",
      job: {
        handler: "./src/functions/check-new-releases.handler",
        link: [vinylProductsTable, firecrawlApiKey, senderEmail, recipientEmail],
        timeout: "10 minutes",
        memory: "512 MB",
        environment: {
          // Configure your preferences here (or override via AWS console):
          NOTIFY_GENRES: "",           // e.g. "Electronic/EDM,Hip Hop/Urban"
          NOTIFY_MAX_PRICE_ZAR: "",    // e.g. "600"
          NOTIFY_KEYWORDS: "",         // e.g. "Aphex Twin,Radiohead"
        },
      },
    });

    return {
      scrapeDataTable: scrapeDataTable.name,
      vinylProductsTable: vinylProductsTable.name,
      scrapeQueueUrl: scrapeQueue.url,
      triggerFunctionName: triggerFunction.name,
      triggerFunctionUrl: triggerFunction.url,
      scrapeFunctionUrl: scrapeFunction.url,
    };
  },
});
