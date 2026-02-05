import { chromium } from 'patchright';
import fs from 'fs';
import path from 'path';
import os from 'os';

const firstName = process.argv[2];

if (!firstName) {
  console.error("Usage: bun run parse.ts name");
  process.exit(1);
}

const csvFile = `shp-result_${Date.now()}.csv`;
fs.writeFileSync(
  csvFile,
  'productName,price,priceMin,priceMax,priceBeforeDiscount,historicalSold,likedCount,rating,shopName,itemid,shopid,scrapeDate\n'
);

const scrapeDate = new Date().toISOString();
let nomore = false;

(async () => {
  const browser = await chromium.launchPersistentContext(path.join(os.tmpdir(), 'patchright_profile'), {
    channel: 'chrome',
    headless: false,
    viewport: null,
  });

  const page = await browser.newPage();

  await page.goto("https://shopee.co.id/buyer/login?next=https%3A%2F%2Fshopee.co.id%2F");

  console.log("Silakan login dulu...");
  await page.waitForSelector('.navbar__username', { timeout: 0 });

  // const firstName = prompt('Search apa?');
  // console.log('Hello,', firstName);

  let lastHit = Date.now();
  page.on('response', async res => {
    try {
      if (!res.url().includes('/api/v4/search/search_items')) return;
      const data = (await res.json());
      nomore = data.nomore;
      for (const item of data.items ?? []) {
        const item_data = item.item_basic;
        const row = [
          item_data.name ?? '',
          item_data.price ? item_data.price / 100000 : '',
          item_data.price_min ? item_data.price_min / 100000 : '',
          item_data.price_max ? item_data.price_max / 100000 : '',
          item_data.price_before_discount ? item_data.price_before_discount / 100000 : '',
          item_data.historical_sold ?? '',
          item_data.liked_count ?? '',

          item_data.item_rating?.rating_star ?? '',
          item_data.shop_name ?? '',
          item_data.itemid ?? '',
          item_data.shopid ?? '',
          scrapeDate,
        ]
          .map(v => `"${String(v).replace(/"/g, '""')}"`)
          .join(',');
        // console.log(row);

        fs.appendFileSync(csvFile, row + '\n');
      }

      if (data.has_more === false) {
      }
    } catch (err) {
      console.error('Intercept error:', err);
    }
  });

  await page.goto(`https://shopee.co.id/search?keyword=${firstName}`);
  while (true) {
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(800);
    if (Date.now() - lastHit > 5000) {
      console.log('No more responses, stopping');
      break;
    }
  }

  let pageNum = 1;
  while (nomore == false) {
    const newPage = await browser.newPage();
    await newPage.goto(`https://shopee.co.id/search?keyword=${firstName}&page=${pageNum}`);

    let lastHitPage = Date.now();
    newPage.on('response', async res => {
      try {
        if (!res.url().includes('/api/v4/search/search_items')) return;
        const data = (await res.json());
        nomore = data.nomore;
        for (const item of data.items ?? []) {
          const item_data = item.item_basic;
          const row = [
            item_data.name ?? '',
            item_data.price ? item_data.price / 100000 : '',
            item_data.price_min ? item_data.price_min / 100000 : '',
            item_data.price_max ? item_data.price_max / 100000 : '',
            item_data.price_before_discount ? item_data.price_before_discount / 100000 : '',
            item_data.historical_sold ?? '',
            item_data.liked_count ?? '',

            item_data.item_rating?.rating_star ?? '',
            item_data.shop_name ?? '',
            item_data.itemid ?? '',
            item_data.shopid ?? '',
            scrapeDate,
          ]
            .map(v => `"${String(v).replace(/"/g, '""')}"`)
            .join(',');
          // console.log(row);

          fs.appendFileSync(csvFile, row + '\n');
        }


      } catch (err) {
        console.error('Intercept error:', err);
      }
    });
    while (true) {
      await newPage.mouse.wheel(0, 1500);
      await newPage.waitForTimeout(800);
      if (Date.now() - lastHitPage > 5000) {
        console.log('No more responses, stopping' + pageNum);
        break;
      }
    }
    await newPage.close();
    pageNum++;
  }
  await browser.close();
})();