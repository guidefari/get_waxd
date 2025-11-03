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

    const scrapeQueue = new sst.aws.Queue("ScrapeQueue",);

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
      url: true
    });

    return {
      scrapeDataTable: scrapeDataTable.name,
      scrapeQueueUrl: scrapeQueue.url,
      triggerFunctionName: triggerFunction.name,
      triggerFunctionUrl: triggerFunction.url,
      scrapeFunctionUrl: scrapeFunction.url,
    };
  },
});
