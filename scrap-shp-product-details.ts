import fs from "fs";
import path from "path";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify";
import { chromium } from "patchright";
import os from "os";

const inputFile = process.argv[2];

if (!inputFile) {
  console.error("Usage: bun run parse.ts <file.csv>");
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`File not found: ${inputFile}`);
  process.exit(1);
}

const dir = path.dirname(inputFile);
const base = path.basename(inputFile);
const outputFile = path.join(dir, `details_${base}_${Date.now()}.csv`);

const parser = fs.createReadStream(inputFile).pipe(
  parse({
    columns: true,
    trim: true,
  })
);

const stringifier = stringify({
  header: true,
});

const browser = await chromium.launchPersistentContext(
  path.join(os.tmpdir(), "patchright_profile"),
  {
    channel: "chrome",
    headless: false,
    viewport: null,
  }
);

const page = await browser.newPage();

await page.goto(
  "https://shopee.co.id/buyer/login?next=https%3A%2F%2Fshopee.co.id%2F"
);

console.log("Silakan login dulu...");
await page.waitForSelector(".navbar__username", { timeout: 0 });

function waitForItemDetails(page: any) {
  return new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => {
      page.off("response", onResponse);
      reject(new Error("API timeout"));
    }, 10_000);

    const onResponse = async (res: any) => {
      try {
        if (!res.url().includes("/get_pc")) return;
        const data = await res.json();
        const item = await data?.data?.item;
        const attrs = await item?.attributes ?? [];
        
        attrs.forEach((attr: { name: any; value: any; }) => {
          console.log(attr.name + ": " + attr.value);
        });

        const attributes = JSON.stringify(
          Object.fromEntries(
            attrs.map((a: { name: string; value: string }) => [a.name, a.value])
          )
        );

        clearTimeout(timeout);
        page.off("response", onResponse);
        resolve({ attributes });
      } catch (err) {
        clearTimeout(timeout);
        page.off("response", onResponse);
        reject(err);
      }
    };

    page.on("response", onResponse);
  });
}

async function processRow(page: any, record: any) {
  const { shopid, itemid } = record;
  const itemUrl = `https://shopee.co.id/x-i.${shopid}.${itemid}`;
  const apiPromise = waitForItemDetails(page);

  await page.goto(itemUrl, { waitUntil: "domcontentloaded" });

  const { attributes } = await apiPromise;

  return {
    ...record,
    links: itemUrl,
    attributes: attributes,
  };
}

stringifier.pipe(fs.createWriteStream(outputFile));

for await (const record of parser) {
  try {
    const enriched = await processRow(page, record);
    stringifier.write(enriched);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Failed:", record.itemid, errorMessage);

    // still write row (optional)
    stringifier.write({
      ...record,
      error: errorMessage,
    });
  }
}

stringifier.end();

console.log(`✅ Done. Output written to: ${outputFile}`);
await browser.close();