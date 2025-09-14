import { SiteConfiguration, ScraperResult } from "../types/scraper";
import { mrVinylConfig, scrapeMrVinyl } from "./mr-vinyl";

export type ScraperFunction = (url: string, page: any) => Promise<ScraperResult>;

export const siteConfigs: Record<string, SiteConfiguration> = {
  "mr-vinyl": mrVinylConfig,
};

export const scrapers: Record<string, ScraperFunction> = {
  "mr-vinyl": scrapeMrVinyl,
};

export function getSiteConfig(siteId: string): SiteConfiguration | null {
  return siteConfigs[siteId] || null;
}

export function getScraper(siteId: string): ScraperFunction | null {
  return scrapers[siteId] || null;
}

export function getAllSiteConfigs(): SiteConfiguration[] {
  return Object.values(siteConfigs);
}

export function generatePageUrls(siteId: string): string[] {
  const config = getSiteConfig(siteId);
  if (!config || !config.scrapeConfig.pagination) {
    return [];
  }

  const { pagination } = config.scrapeConfig;
  if (!pagination.pattern) {
    return [config.baseUrl];
  }

  const urls: string[] = [];
  const maxPages = pagination.maxPages || 1;

  for (let page = 1; page <= maxPages; page++) {
    const url = pagination.pattern.replace("{page}", page.toString());
    urls.push(url);
  }

  return urls;
}