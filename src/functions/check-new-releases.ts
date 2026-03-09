import { Resource } from "sst";
import { scrapeAllCategories, CATEGORIES } from "../scrapers/mr-vinyl-firecrawl";
import { upsertProducts } from "../utils/vinyl-products-db";
import { sendNewReleasesEmail } from "../utils/notify";
import type { StoredVinylProduct } from "../utils/vinyl-products-db";

// User preference filters — configure via SST secrets / env vars
function applyPreferences(
  products: StoredVinylProduct[],
  opts: {
    genres?: string[]; // e.g. ["Electronic/EDM", "Hip Hop/Urban"]
    maxPriceZAR?: number; // e.g. 600
    keywords?: string[]; // artist or album name substrings, case-insensitive
  }
): StoredVinylProduct[] {
  let filtered = products;

  if (opts.genres && opts.genres.length > 0) {
    filtered = filtered.filter((p) => opts.genres!.includes(p.genre));
  }

  if (opts.maxPriceZAR && opts.maxPriceZAR > 0) {
    filtered = filtered.filter((p) => p.priceZAR <= opts.maxPriceZAR!);
  }

  if (opts.keywords && opts.keywords.length > 0) {
    const lowerKeywords = opts.keywords.map((k) => k.toLowerCase());
    filtered = filtered.filter((p) =>
      lowerKeywords.some((kw) => p.name.toLowerCase().includes(kw))
    );
  }

  return filtered;
}

function parsePreferences() {
  const genres = process.env.NOTIFY_GENRES
    ? process.env.NOTIFY_GENRES.split(",").map((g) => g.trim())
    : [];

  const maxPrice = process.env.NOTIFY_MAX_PRICE_ZAR
    ? parseInt(process.env.NOTIFY_MAX_PRICE_ZAR, 10)
    : 0;

  const keywords = process.env.NOTIFY_KEYWORDS
    ? process.env.NOTIFY_KEYWORDS.split(",").map((k) => k.trim())
    : [];

  return { genres, maxPriceZAR: maxPrice, keywords };
}

export const handler = async () => {
  console.log("[CheckNewReleases] Starting scrape run...");

  const firecrawlApiKey = (Resource as any).FirecrawlApiKey.value as string;
  const senderEmail = (Resource as any).SenderEmail.value as string;
  const recipientEmail = (Resource as any).RecipientEmail.value as string;

  // Determine which categories to scrape
  // If NOTIFY_GENRES is set, only scrape those genres; otherwise scrape new-sealed + all genres
  const prefs = parsePreferences();
  let categorySlugs: string[] | undefined;
  if (prefs.genres.length > 0) {
    categorySlugs = CATEGORIES.filter((c) => prefs.genres.includes(c.label)).map(
      (c) => c.slug
    );
    // Always include new-sealed for new arrivals
    if (!categorySlugs.includes("new-sealed")) {
      categorySlugs.unshift("new-sealed");
    }
  }

  // Scrape current catalog
  const currentProducts = await scrapeAllCategories(firecrawlApiKey, categorySlugs);
  console.log(`[CheckNewReleases] Scraped ${currentProducts.length} products total`);

  if (currentProducts.length === 0) {
    console.warn("[CheckNewReleases] No products scraped — skipping notification");
    return { statusCode: 200, body: "No products scraped" };
  }

  // Upsert to DynamoDB; returns which ones are brand new
  const { newProducts, updatedCount } = await upsertProducts(currentProducts);
  console.log(
    `[CheckNewReleases] ${newProducts.length} new products, ${updatedCount} total upserted`
  );

  // Apply user preferences to filter which new products to notify about
  const notifyProducts = prefs.genres.length > 0 || prefs.maxPriceZAR > 0 || prefs.keywords.length > 0
    ? applyPreferences(newProducts, prefs)
    : newProducts;

  console.log(`[CheckNewReleases] ${notifyProducts.length} products after preference filtering`);

  // Send email notification
  await sendNewReleasesEmail({
    senderEmail,
    recipientEmail,
    newProducts: notifyProducts,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      scraped: currentProducts.length,
      new: newProducts.length,
      notified: notifyProducts.length,
    }),
  };
};
