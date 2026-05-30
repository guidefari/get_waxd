import FirecrawlApp from "@mendable/firecrawl-js";

export interface VinylProduct {
  name: string;
  price: string;
  priceZAR: number; // parsed numeric price
  imageUrl: string;
  productUrl: string;
  genre: string;
  siteId: string;
}

export interface FirecrawlScrapeResult {
  products: VinylProduct[];
  category: string;
  pageUrl: string;
  totalFound: number;
}

const SITE_ID = "mr-vinyl";
const BASE_URL = "https://www.mrvinyl.co.za";

export const CATEGORIES = [
  { slug: "new-sealed", label: "New & Sealed" },
  { slug: "electronic-edm", label: "Electronic/EDM" },
  { slug: "rock-alternative-metal", label: "Rock/Alternative/Metal" },
  { slug: "hip-hop-urban", label: "Hip Hop/Urban" },
  { slug: "blues-soul-jazz-related", label: "Blues/Soul/Jazz" },
  { slug: "pop-adult-contemporary", label: "Pop/Adult Contemporary" },
  { slug: "classical", label: "Classical" },
  { slug: "reggae-other-genres", label: "Reggae/Other" },
] as const;

const PRODUCT_SCHEMA = {
  type: "object",
  properties: {
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Full album/product title including artist name",
          },
          price: {
            type: "string",
            description: "Price in ZAR, e.g. R490.00",
          },
          imageUrl: {
            type: "string",
            description: "Product image URL",
          },
          productUrl: {
            type: "string",
            description: "Full URL to product page",
          },
        },
        required: ["name", "price", "productUrl"],
      },
    },
  },
  required: ["products"],
};

function parsePrice(priceStr: string): number {
  const match = priceStr.replace(/[R,\s]/g, "").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

export async function scrapeCategory(
  apiKey: string,
  categorySlug: string,
  categoryLabel: string,
  page = 1
): Promise<FirecrawlScrapeResult> {
  const app = new FirecrawlApp({ apiKey });
  const pageUrl =
    page === 1
      ? `${BASE_URL}/product-category/${categorySlug}/`
      : `${BASE_URL}/product-category/${categorySlug}/page/${page}/`;

  console.log(`[Firecrawl] Scraping: ${pageUrl}`);

  const result = await app.scrapeUrl(pageUrl, {
    formats: ["extract"],
    extract: { schema: PRODUCT_SCHEMA },
  } as any);

  if (!result.success) {
    console.error(`[Firecrawl] Failed to scrape ${pageUrl}:`, (result as any).error);
    return { products: [], category: categoryLabel, pageUrl, totalFound: 0 };
  }

  const rawProducts: any[] = (result as any).extract?.products ?? [];

  const products: VinylProduct[] = rawProducts
    .filter((p) => p.name && p.price && p.productUrl)
    .map((p) => ({
      name: p.name.trim(),
      price: p.price.trim(),
      priceZAR: parsePrice(p.price),
      imageUrl: p.imageUrl ?? "",
      productUrl: p.productUrl.startsWith("http")
        ? p.productUrl
        : `${BASE_URL}${p.productUrl}`,
      genre: categoryLabel,
      siteId: SITE_ID,
    }));

  console.log(`[Firecrawl] Found ${products.length} products in ${categoryLabel} (page ${page})`);
  return { products, category: categoryLabel, pageUrl, totalFound: products.length };
}

export async function scrapeAllCategories(
  apiKey: string,
  categorySlugs?: string[]
): Promise<VinylProduct[]> {
  const targets = categorySlugs
    ? CATEGORIES.filter((c) => categorySlugs.includes(c.slug))
    : CATEGORIES;

  const allProducts: VinylProduct[] = [];
  const seen = new Set<string>();

  for (const category of targets) {
    const result = await scrapeCategory(apiKey, category.slug, category.label);
    for (const product of result.products) {
      if (!seen.has(product.productUrl)) {
        seen.add(product.productUrl);
        allProducts.push(product);
      }
    }
    // Polite delay between categories
    await new Promise((r) => setTimeout(r, 1500));
  }

  return allProducts;
}
