import { chromium } from 'patchright';
import fs from 'fs';

const csvFile = `result_${Date.now()}.csv`;
fs.writeFileSync(
  csvFile,
  'productName,price,originalPrice,sold,rating,seller,scrapeDate\n'
);


const scrapeDate = new Date().toISOString();
(async () => {
    const browser = await chromium.launchPersistentContext('/tmp/patchright_profile', {
        channel: 'chrome',
        headless: false,
        viewport: null,
    });

    async function getText(page: { locator: (arg0: any) => any; }, selector: any) {
        const loc = page.locator(selector);
        return (await loc.count()) > 0 ? await loc.first().innerText() : null;
    }
    
    const page = await browser.newPage();

    await page.goto("https://shopee.co.id/buyer/login?next=https%3A%2F%2Fshopee.co.id%2F");

    console.log("Silakan login dulu...");
    await page.waitForSelector('.navbar__username', { timeout: 0 }); 

    const firstName = prompt('Search apa?')
    console.log('Hello,', firstName)

    await page.goto(`https://shopee.co.id/search?keyword=${firstName}`);

    const itemSelector = '.shopee-search-item-result__item';

    const nextPageBtn = '.shopee-icon-button--right';

    while (true) {
        await page.waitForSelector(itemSelector);
        const items = page.locator(itemSelector);
        const count = await items.count();

        // console.log(`Menemukan ${count} item.`);

        for (let i = 0; i < count; i++) {
            const currentItem = items.nth(i);
            await currentItem.scrollIntoViewIfNeeded();
            // console.log(`Mengklik item ke-${i + 1}`);

            const linkElement = await currentItem.locator('a.contents').getAttribute('href');
            const baseURL = 'https://shopee.co.id';

            const newPage = await browser.newPage();

            await newPage.goto(baseURL + linkElement, { waitUntil: 'domcontentloaded' });
            await newPage.waitForSelector('.IZPeQz.B67UQ0', { timeout: 10000 });
            const productName   = await getText(newPage, '.vR6K3w');
            const price         = await getText(newPage, '.IZPeQz.B67UQ0');
            const originalPrice = await getText(newPage, '.ZA5sW5');
            const sold          = await getText(newPage, '.AcmPRb');
            const rating        = await getText(newPage, '.F9RHbS.dQEiAI.jMXp4d');
            const seller        = await getText(newPage, '.fV3TIn');

            const row = [
            productName,
            price,
            originalPrice,
            sold,
            rating,
            seller,
            scrapeDate
            ]
            .map(v => `"${(v ?? '').replace(/"/g, '""')}"`)
            .join(',');

            fs.appendFileSync(csvFile, row + '\n');

            await newPage.close();
        }
        const nextBtn = page.locator(nextPageBtn);
        if ((await nextBtn.count()) === 0) {
            console.log('Pagination habis.');
            break;
        }

        const isDisabled = await nextBtn.getAttribute('disabled');
        if (isDisabled !== null) {
            console.log('Next page sudah disabled.');
            break;
        }

        console.log('Pindah ke halaman berikutnya...');
        await nextBtn.click();

        // tunggu halaman baru keload (item refresh)
        await page.waitForTimeout(1000);
        await page.waitForSelector(itemSelector);
    }

    await browser.close();
})();
