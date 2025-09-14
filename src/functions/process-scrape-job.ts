import { SQSHandler } from "aws-lambda";
import { ScrapeJobMessage, ScrapedData } from "../types/scraper";
import { getScraper } from "../scrapers";
import { saveScrapedData } from "../utils/db";
import { v4 as uuidv4 } from "uuid";

export const handler: SQSHandler = async (event) => {
  console.log(`Processing ${event.Records.length} scrape jobs`);

  for (const record of event.Records) {
    try {
      const message: ScrapeJobMessage = JSON.parse(record.body);
      console.log(`Processing job for ${message.siteId}: ${message.url}`);

      const scraper = getScraper(message.siteId);
      if (!scraper) {
        console.error(`No scraper found for site: ${message.siteId}`);
        continue;
      }

      const { chromium } = require("playwright");
      const browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      });

      const page = await browser.newPage();

      try {
        const result = await scraper(message.url, page);

        if (result.success && result.data) {
          const scrapedData: ScrapedData = {
            id: uuidv4(),
            siteId: message.siteId,
            url: message.url,
            scrapedAt: new Date().toISOString(),
            data: result.data,
            metadata: message.metadata,
          };

          await saveScrapedData(scrapedData);
          console.log(`Saved scraped data for ${message.url}`);
        } else {
          console.error(`Scraping failed for ${message.url}: ${result.error}`);
        }
      } finally {
        await browser.close();
      }
    } catch (error) {
      console.error("Error processing scrape job:", error);
    }
  }
};