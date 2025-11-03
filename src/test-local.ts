#!/usr/bin/env bun

import { getScraper, getAllSiteConfigs, generatePageUrls } from "./scrapers";

async function testMrVinylScraper() {
  console.log("🚀 Testing Mr Vinyl scraper locally...");

  const puppeteer = require("puppeteer");

  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();

  try {
    const scraper = getScraper("mr-vinyl");
    if (!scraper) {
      throw new Error("Mr Vinyl scraper not found");
    }

    const testUrl = "https://www.mrvinyl.co.za/product-category/electronic-edm/page/1/";
    console.log(`\n📄 Testing URL: ${testUrl}`);

    const result = await scraper(testUrl, page);

    if (result.success && result.data) {
      console.log("\n✅ Scraping successful!");
      console.log(`📊 Found ${result.data.totalProductsFound} products`);
      console.log("\n🔍 Sample products:");

      if (result.data.products && Array.isArray(result.data.products)) {
        result.data.products.slice(0, 3).forEach((product: any, index: number) => {
          console.log(`\n${index + 1}. ${product.name}`);
          console.log(`   Price: ${product.price}`);
          console.log(`   URL: ${product.productUrl}`);
        });
      }
    } else {
      console.error("\n❌ Scraping failed:", result.error);
    }

    console.log("\n🗂️  Available site configurations:");
    const configs = getAllSiteConfigs();
    configs.forEach(config => {
      console.log(`- ${config.name} (${config.id}): ${config.baseUrl}`);
    });

    console.log("\n🔗 All Mr Vinyl URLs to scrape:");
    const urls = generatePageUrls("mr-vinyl");
    console.log(`Total URLs: ${urls.length}`);
    urls.slice(0, 5).forEach((url, index) => {
      console.log(`${index + 1}. ${url}`);
    });
    if (urls.length > 5) {
      console.log(`... and ${urls.length - 5} more`);
    }

  } catch (error) {
    console.error("\n💥 Error during testing:", error);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  testMrVinylScraper()
    .then(() => {
      console.log("\n🏁 Test completed!");
      process.exit(0);
    })
    .catch(error => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}