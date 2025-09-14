#!/usr/bin/env bun

async function testLiveLambda() {
  try {
    console.log("🚀 Testing live Lambda functions...");

    // Get the function URL from SST outputs
    // You'll need to replace this with the actual URL after deployment
    const triggerUrl = process.env.TRIGGER_FUNCTION_URL || "YOUR_FUNCTION_URL_HERE";

    if (triggerUrl === "YOUR_FUNCTION_URL_HERE") {
      console.log("❌ Please set TRIGGER_FUNCTION_URL environment variable or update this script");
      console.log("   Get the URL from: bun run dev or bun run deploy output");
      return;
    }

    console.log(`📡 Testing trigger function: ${triggerUrl}`);

    // Test triggering scrape for Mr Vinyl
    const response = await fetch(triggerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        siteId: "mr-vinyl"
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Successfully triggered scraping:");
      console.log(`   Site: ${result.siteId}`);
      console.log(`   Jobs queued: ${result.totalJobs}`);
      console.log(`   Message: ${result.message}`);
    } else {
      console.error("❌ Failed to trigger scraping:");
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${result.error}`);
    }

  } catch (error) {
    console.error("💥 Error testing live Lambda:", error);
  }
}

// Test single page scraping
async function testSinglePageScraping() {
  try {
    const scrapeUrl = process.env.SCRAPE_FUNCTION_URL || "YOUR_SCRAPE_URL_HERE";

    if (scrapeUrl === "YOUR_SCRAPE_URL_HERE") {
      console.log("ℹ️ SCRAPE_FUNCTION_URL not set, skipping single page test");
      return;
    }

    console.log(`📄 Testing single page scraping: ${scrapeUrl}`);

    const response = await fetch(scrapeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        siteId: "mr-vinyl",
        url: "https://www.mrvinyl.co.za/product-category/electronic-edm/page/1/"
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log("✅ Single page scraping successful:");
      console.log(`   Products found: ${result.data?.data?.totalProductsFound || 0}`);
      console.log(`   Scraped at: ${result.data?.scrapedAt}`);
    } else {
      console.error("❌ Single page scraping failed:");
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${result.error}`);
    }

  } catch (error) {
    console.error("💥 Error testing single page scraping:", error);
  }
}

if (require.main === module) {
  Promise.resolve()
    .then(testLiveLambda)
    .then(testSinglePageScraping)
    .then(() => {
      console.log("\n🏁 Live testing completed!");
      process.exit(0);
    })
    .catch(error => {
      console.error("Test failed:", error);
      process.exit(1);
    });
}