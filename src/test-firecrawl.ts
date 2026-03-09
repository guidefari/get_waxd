/**
 * Local test script: scrapes Mr Vinyl using Firecrawl and displays results.
 *
 * Usage:
 *   FIRECRAWL_API_KEY=fc-xxx bun run test-vinyl
 *
 * Optional filters:
 *   CATEGORY=new-sealed          scrape a single category slug
 *   MAX_PRICE=600                show only records ≤ R600
 *   KEYWORDS=Aphex,Radiohead     filter by artist/album name
 */

import { scrapeCategory, scrapeAllCategories, CATEGORIES } from "./scrapers/mr-vinyl-firecrawl";
import type { VinylProduct } from "./scrapers/mr-vinyl-firecrawl";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
if (!FIRECRAWL_API_KEY) {
  console.error("❌  Set FIRECRAWL_API_KEY environment variable first.");
  console.error("   export FIRECRAWL_API_KEY=fc-your-key-here");
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hr(char = "─", width = 72) {
  return char.repeat(width);
}

function pad(str: string, width: number) {
  return str.length >= width ? str.slice(0, width - 1) + "…" : str.padEnd(width);
}

function formatPrice(p: VinylProduct) {
  return p.price.startsWith("R") ? p.price : `R${p.price}`;
}

function printProducts(products: VinylProduct[]) {
  if (products.length === 0) {
    console.log("  (none found)\n");
    return;
  }

  // Group by genre
  const grouped: Record<string, VinylProduct[]> = {};
  for (const p of products) {
    (grouped[p.genre] ??= []).push(p);
  }

  for (const [genre, items] of Object.entries(grouped)) {
    console.log(`\n  ▸ ${genre} (${items.length})`);
    console.log(`  ${hr("─", 68)}`);
    console.log(`  ${"Title".padEnd(46)} ${"Price".padEnd(10)} URL`);
    console.log(`  ${hr("─", 68)}`);
    for (const p of items) {
      const title = pad(p.name, 46);
      const price = formatPrice(p).padEnd(10);
      const shortUrl = p.productUrl.replace("https://www.mrvinyl.co.za", "");
      console.log(`  ${title} ${price} ${shortUrl}`);
    }
  }
}

function applyFilters(products: VinylProduct[]): VinylProduct[] {
  let filtered = products;

  const maxPrice = process.env.MAX_PRICE ? parseInt(process.env.MAX_PRICE, 10) : 0;
  if (maxPrice > 0) {
    filtered = filtered.filter((p) => p.priceZAR <= maxPrice);
  }

  const keywords = process.env.KEYWORDS
    ? process.env.KEYWORDS.split(",").map((k) => k.trim().toLowerCase())
    : [];
  if (keywords.length > 0) {
    filtered = filtered.filter((p) =>
      keywords.some((kw) => p.name.toLowerCase().includes(kw))
    );
  }

  return filtered;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const categorySlug = process.env.CATEGORY;

  console.log("\n" + hr("═"));
  console.log("  🎵  Mr Vinyl — Firecrawl Catalog");
  console.log(hr("═"));
  console.log(`  Site   : https://www.mrvinyl.co.za`);
  console.log(`  Date   : ${new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}`);
  if (categorySlug) console.log(`  Filter : category = ${categorySlug}`);
  if (process.env.MAX_PRICE) console.log(`  Filter : max price = R${process.env.MAX_PRICE}`);
  if (process.env.KEYWORDS) console.log(`  Filter : keywords = ${process.env.KEYWORDS}`);
  console.log(hr("─"));

  let products: VinylProduct[];

  if (categorySlug) {
    const category = CATEGORIES.find((c) => c.slug === categorySlug);
    if (!category) {
      console.error(`\n❌  Unknown category slug: "${categorySlug}"`);
      console.error("   Available slugs:");
      CATEGORIES.forEach((c) => console.error(`     ${c.slug.padEnd(30)} ${c.label}`));
      process.exit(1);
    }
    console.log(`\n  Scraping: ${category.label}...`);
    const result = await scrapeCategory(FIRECRAWL_API_KEY, categorySlug, category.label);
    products = result.products;
  } else {
    console.log("\n  Scraping all categories (this may take a minute)...");
    products = await scrapeAllCategories(FIRECRAWL_API_KEY);
  }

  const filtered = applyFilters(products);

  console.log("\n" + hr("═"));
  console.log(`  Results: ${filtered.length} records${filtered.length !== products.length ? ` (filtered from ${products.length})` : ""}`);
  console.log(hr("═"));

  printProducts(filtered);

  // Summary stats
  console.log("\n" + hr("─"));
  const total = filtered.length;
  const avgPrice =
    total > 0 ? filtered.reduce((sum, p) => sum + p.priceZAR, 0) / total : 0;
  const sorted = [...filtered].sort((a, b) => a.priceZAR - b.priceZAR);
  console.log(`  Total records : ${total}`);
  if (total > 0) {
    console.log(`  Average price : R${avgPrice.toFixed(2)}`);
    console.log(`  Cheapest      : ${sorted[0].name} — ${formatPrice(sorted[0])}`);
    console.log(`  Most expensive: ${sorted[total - 1].name} — ${formatPrice(sorted[total - 1])}`);
  }
  console.log(hr("─") + "\n");

  // Available categories reminder
  console.log("  Available categories:");
  CATEGORIES.forEach((c) =>
    console.log(`    CATEGORY=${c.slug.padEnd(28)} → ${c.label}`)
  );
  console.log();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
