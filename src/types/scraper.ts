export interface ScrapeJobMessage {
  siteId: string;
  url: string;
  pageNumber?: number;
  metadata?: Record<string, any>;
}

export interface ScrapedData {
  id: string;
  siteId: string;
  url: string;
  scrapedAt: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface SiteConfiguration {
  id: string;
  name: string;
  baseUrl: string;
  scrapeConfig: {
    selectors: Record<string, string>;
    waitForSelector?: string;
    pagination?: {
      type: 'url-pattern' | 'next-button';
      pattern?: string;
      nextButtonSelector?: string;
      maxPages?: number;
    };
  };
}

export interface ScraperResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}