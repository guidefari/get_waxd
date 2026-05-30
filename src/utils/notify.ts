import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import type { StoredVinylProduct } from "./vinyl-products-db";

const ses = new SESClient({ region: process.env.AWS_REGION ?? "us-east-1" });

function formatPrice(price: string): string {
  return price.startsWith("R") ? price : `R${price}`;
}

function productRow(p: StoredVinylProduct): string {
  return `
    <tr>
      <td style="padding:12px 8px; border-bottom:1px solid #eee;">
        ${p.imageUrl ? `<img src="${p.imageUrl}" width="60" height="60" style="object-fit:cover; border-radius:4px;" alt="">` : ""}
      </td>
      <td style="padding:12px 8px; border-bottom:1px solid #eee;">
        <a href="${p.productUrl}" style="color:#1a1a1a; font-weight:600; text-decoration:none;">${p.name}</a>
        <br><span style="color:#666; font-size:0.85em;">${p.genre}</span>
      </td>
      <td style="padding:12px 8px; border-bottom:1px solid #eee; font-weight:bold; color:#2d7a3a;">
        ${formatPrice(p.price)}
      </td>
      <td style="padding:12px 8px; border-bottom:1px solid #eee;">
        <a href="${p.productUrl}" style="background:#1a1a1a; color:#fff; padding:6px 14px; border-radius:4px; text-decoration:none; font-size:0.85em;">View</a>
      </td>
    </tr>`;
}

function buildEmailHtml(newProducts: StoredVinylProduct[]): string {
  const grouped: Record<string, StoredVinylProduct[]> = {};
  for (const p of newProducts) {
    (grouped[p.genre] ??= []).push(p);
  }

  const sections = Object.entries(grouped)
    .map(
      ([genre, products]) => `
      <h3 style="color:#333; border-left:4px solid #1a1a1a; padding-left:10px; margin-top:28px;">${genre}</h3>
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:8px; text-align:left; width:70px;"></th>
            <th style="padding:8px; text-align:left;">Title</th>
            <th style="padding:8px; text-align:left; width:100px;">Price</th>
            <th style="padding:8px; text-align:left; width:80px;"></th>
          </tr>
        </thead>
        <tbody>${products.map(productRow).join("")}</tbody>
      </table>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width:700px; margin:0 auto; padding:24px; color:#1a1a1a;">
  <div style="background:#1a1a1a; padding:20px 24px; border-radius:8px 8px 0 0;">
    <h1 style="color:#fff; margin:0; font-size:1.4em;">🎵 New Vinyl Drops — Mr Vinyl</h1>
    <p style="color:#aaa; margin:6px 0 0;">${newProducts.length} new record${newProducts.length !== 1 ? "s" : ""} just landed</p>
  </div>
  <div style="border:1px solid #eee; border-top:none; padding:20px 24px; border-radius:0 0 8px 8px;">
    ${sections}
    <hr style="margin-top:32px; border:none; border-top:1px solid #eee;">
    <p style="color:#999; font-size:0.8em; text-align:center; margin-top:16px;">
      <a href="https://www.mrvinyl.co.za" style="color:#999;">mrvinyl.co.za</a> ·
      Scraped ${new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}
    </p>
  </div>
</body>
</html>`;
}

function buildEmailText(newProducts: StoredVinylProduct[]): string {
  const lines = [
    `New Vinyl Drops — Mr Vinyl (${newProducts.length} new records)`,
    "=".repeat(50),
    "",
  ];
  for (const p of newProducts) {
    lines.push(`${p.name}`);
    lines.push(`  Genre: ${p.genre}`);
    lines.push(`  Price: ${formatPrice(p.price)}`);
    lines.push(`  URL: ${p.productUrl}`);
    lines.push("");
  }
  return lines.join("\n");
}

export interface NotifyOptions {
  senderEmail: string;
  recipientEmail: string;
  newProducts: StoredVinylProduct[];
}

export async function sendNewReleasesEmail(opts: NotifyOptions): Promise<void> {
  const { senderEmail, recipientEmail, newProducts } = opts;

  if (newProducts.length === 0) {
    console.log("[Notify] No new products to notify about");
    return;
  }

  const subject = `🎵 ${newProducts.length} New Vinyl Drop${newProducts.length !== 1 ? "s" : ""} — Mr Vinyl`;

  await ses.send(
    new SendEmailCommand({
      Source: senderEmail,
      Destination: { ToAddresses: [recipientEmail] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: buildEmailHtml(newProducts), Charset: "UTF-8" },
          Text: { Data: buildEmailText(newProducts), Charset: "UTF-8" },
        },
      },
    })
  );

  console.log(`[Notify] Sent email for ${newProducts.length} new products to ${recipientEmail}`);
}
