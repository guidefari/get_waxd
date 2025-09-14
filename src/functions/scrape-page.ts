import { APIGatewayProxyHandler } from "aws-lambda";
import { getScraper } from "../scrapers";
import { saveScrapedData } from "../utils/db";
import { ScrapedData } from "../types/scraper";
import { v4 as uuidv4 } from "uuid";

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { siteId, url } = JSON.parse(event.body || "{}");

    if (!siteId || !url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "siteId and url are required" }),
      };
    }

    const scraper = getScraper(siteId);
    if (!scraper) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `No scraper found for site: ${siteId}` }),
      };
    }

    const { chromium } = require("playwright");
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();

    try {
      const result = await scraper(url, page);

      if (result.success && result.data) {
        const scrapedData: ScrapedData = {
          id: uuidv4(),
          siteId,
          url,
          scrapedAt: new Date().toISOString(),
          data: result.data,
        };

        await saveScrapedData(scrapedData);

        return {
          statusCode: 200,
          body: JSON.stringify({
            message: "Scraping completed successfully",
            data: scrapedData,
          }),
        };
      } else {
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: "Scraping failed",
            details: result.error,
          }),
        };
      }
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("Error in scrape-page handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};