import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";
import type { VinylProduct } from "../scrapers/mr-vinyl-firecrawl";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export interface StoredVinylProduct extends VinylProduct {
  firstSeen: string;
  lastSeen: string;
}

function tableName(): string {
  return (Resource as any).VinylProducts.name;
}

export async function getProduct(productUrl: string): Promise<StoredVinylProduct | undefined> {
  const result = await docClient.send(
    new GetCommand({
      TableName: tableName(),
      Key: { productUrl },
    })
  );
  return result.Item as StoredVinylProduct | undefined;
}

export async function getAllProducts(siteId: string): Promise<StoredVinylProduct[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: tableName(),
      FilterExpression: "siteId = :siteId",
      ExpressionAttributeValues: { ":siteId": siteId },
    })
  );
  return (result.Items ?? []) as StoredVinylProduct[];
}

export async function upsertProducts(products: VinylProduct[]): Promise<{
  newProducts: StoredVinylProduct[];
  updatedCount: number;
}> {
  const now = new Date().toISOString();
  const newProducts: StoredVinylProduct[] = [];

  // Check each product for existence
  const existenceChecks = await Promise.all(
    products.map((p) => getProduct(p.productUrl))
  );

  const toUpsert: StoredVinylProduct[] = products.map((product, i) => {
    const existing = existenceChecks[i];
    if (!existing) {
      const stored: StoredVinylProduct = { ...product, firstSeen: now, lastSeen: now };
      newProducts.push(stored);
      return stored;
    }
    return { ...existing, ...product, lastSeen: now };
  });

  // Batch write in groups of 25 (DynamoDB limit)
  for (let i = 0; i < toUpsert.length; i += 25) {
    const batch = toUpsert.slice(i, i + 25);
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName()]: batch.map((item) => ({
            PutRequest: { Item: item },
          })),
        },
      })
    );
  }

  return { newProducts, updatedCount: toUpsert.length };
}
