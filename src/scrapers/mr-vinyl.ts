import { SiteConfiguration, ScraperResult } from "../types/scraper";

export const mrVinylConfig: SiteConfiguration = {
  id: "mr-vinyl",
  name: "Mr Vinyl",
  baseUrl: "https://www.mrvinyl.co.za",
  scrapeConfig: {
    selectors: {
      products: "[multiple].product-item",
      productName: ".woocommerce-loop-product__title",
      productPrice: ".price .woocommerce-Price-amount",
      productImage: "img",
      productUrl: "a.woocommerce-LoopProduct-link",
    },
    waitForSelector: ".product-item",
    pagination: {
      type: "url-pattern",
      pattern: "https://www.mrvinyl.co.za/product-category/electronic-edm/page/{page}/",
      maxPages: 44,
    },
  },
};

export async function scrapeMrVinyl(url: string, page: any): Promise<ScraperResult> {
  try {
    console.log(`Scraping Mr Vinyl page: ${url}`);

    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector(".product-item", { timeout: 30000 });

    const data = await page.evaluate(() => {
      const products: any[] = [];
      const productElements = document.querySelectorAll('.product-item');

      productElements.forEach((productEl) => {
        try {
          const titleEl = productEl.querySelector('.woocommerce-loop-product__title');
          const priceEl = productEl.querySelector('.price .woocommerce-Price-amount');
          const imageEl = productEl.querySelector('img');
          const linkEl = productEl.querySelector('a.woocommerce-LoopProduct-link');

          const product = {
            name: titleEl?.textContent?.trim() || null,
            price: priceEl?.textContent?.trim() || null,
            imageUrl: imageEl?.src || null,
            productUrl: linkEl?.href || null,
            category: 'Electronic/EDM',
          };

          if (product.name) {
            products.push(product);
          }
        } catch (error) {
          console.warn('Error extracting product:', error);
        }
      });

      return {
        products,
        pageUrl: window.location.href,
        scrapedAt: new Date().toISOString(),
        totalProductsFound: products.length,
      };
    });

    console.log(`Found ${data.totalProductsFound} products on ${url}`);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}