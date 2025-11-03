import type { APIGatewayProxyHandler } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { Resource } from "sst";
import { getSiteConfig, generatePageUrls } from "../scrapers";
import type { ScrapeJobMessage } from "../types/scraper";

const sqs = new SQSClient({});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const { siteId } = JSON.parse(event.body || "{}");

    if (!siteId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "siteId is required" }),
      };
    }

    const config = getSiteConfig(siteId);
    if (!config) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Unknown site: ${siteId}` }),
      };
    }

    const urls = generatePageUrls(siteId);
    console.log(`Queuing ${urls.length} URLs for ${siteId}`);

    const messages: Promise<any>[] = urls.map((url, index) => {
      const message: ScrapeJobMessage = {
        siteId,
        url,
        pageNumber: index + 1,
        metadata: {
          totalPages: urls.length,
        },
      };

      return sqs.send(new SendMessageCommand({
        QueueUrl: Resource.ScrapeQueue.url,
        MessageBody: JSON.stringify(message),
        DelaySeconds: index * 2,
      }));
    });

    await Promise.all(messages);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Queued ${urls.length} scraping jobs for ${config.name}`,
        siteId,
        totalJobs: urls.length,
      }),
    };
  } catch (error) {
    console.error("Error triggering scrape:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};