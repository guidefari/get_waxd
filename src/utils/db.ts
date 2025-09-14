import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import { ScrapedData } from "../types/scraper";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function saveScrapedData(data: ScrapedData) {
  const command = new PutCommand({
    TableName: Resource.ScrapeData.name,
    Item: data,
  });

  return await docClient.send(command);
}

export async function getScrapedDataBySite(siteId: string) {
  const command = new QueryCommand({
    TableName: Resource.ScrapeData.name,
    IndexName: "bySite",
    KeyConditionExpression: "siteId = :siteId",
    ExpressionAttributeValues: {
      ":siteId": siteId,
    },
  });

  const result = await docClient.send(command);
  return result.Items as ScrapedData[];
}

export async function getScrapedDataById(id: string) {
  const command = new GetCommand({
    TableName: Resource.ScrapeData.name,
    Key: { id },
  });

  const result = await docClient.send(command);
  return result.Item as ScrapedData | undefined;
}