import { chromium } from 'patchright';
import fs from 'fs';
import * as readline from 'readline';
import path from 'path';
import os from 'os';

const csvFile = `tiktok-result_${Date.now()}.csv`;
fs.writeFileSync(csvFile, 'username,nickname,views,likes,comments,shares,saves,hashtags,videoUrl,scrapeDate\n');

const question = (prompt: string): Promise<string> => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(prompt, (answer) => { rl.close(); resolve(answer); });
});

(async () => {
  try {
    console.log('🚀 Starting TikTok API scraper...\n');

    const browser = await chromium.launchPersistentContext(
      path.join(os.tmpdir(), 'patchright_tiktok'),
      { channel: 'chrome', headless: false }
    );

    const page = await browser.newPage();
    const searchQuery = await question('🔍 Search: ');
    const targetCount = parseInt(await question('🎯 Target (default 100): ') || '100');

    console.log(`\nSearching "${searchQuery}" - Target: ${targetCount}\n`);

    let allVideos: any[] = [];

    // Intercept API
    page.on('response', async (response) => {
      if (response.url().includes('/api/search/item/full/')) {
        try {
          const data = await response.json();
          if (data.item_list?.length) {
            allVideos.push(...data.item_list);
            console.log(`📦 ${allVideos.length} videos captured`);
          }
        } catch { }
      }
    });

    await page.goto(`https://www.tiktok.com/search/video?q=${encodeURIComponent(searchQuery)}`);
    await page.waitForTimeout(3000);

    console.log('📜 Loading videos...\n');
    let scrollCount = 0;
    while (allVideos.length < targetCount && scrollCount < 50) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
      await page.waitForTimeout(1000);
      scrollCount++;
    }

    await page.waitForTimeout(2000);

    // Remove duplicates
    const videos = Array.from(new Map(allVideos.map(v => [v.id, v])).values()).slice(0, targetCount);

    console.log(`✅ Processing ${videos.length} videos\n`);

    const scrapeDate = new Date().toISOString();

    videos.forEach((v, i) => {
      const username = v.author?.uniqueId || 'N/A';
      const nickname = v.author?.nickname || 'N/A';
      const stats = v.stats || v.statsV2 || {};
      const hashtags = v.challenges?.map((c: any) => c.title).join(', ') ||
        v.textExtra?.filter((t: any) => t.hashtagName).map((t: any) => t.hashtagName).join(', ') || 'N/A';

      console.log(`[${i + 1}/${videos.length}] @${username} - ${nickname}`);
      console.log(`  👁️${stats.playCount || 0} ❤️${stats.diggCount || 0} 💬${stats.commentCount || 0} 🔁${stats.shareCount || 0} ⭐${stats.collectCount || 0}\n`);

      const row = [
        username, nickname,
        stats.playCount || 0, stats.diggCount || 0, stats.commentCount || 0,
        stats.shareCount || 0, stats.collectCount || 0,
        hashtags, `https://www.tiktok.com/@${username}/video/${v.id}`, scrapeDate
      ].map(val => `"${val.toString().replace(/"/g, '""')}"`).join(',');

      fs.appendFileSync(csvFile, row + '\n');
    });

    console.log(`\n✅ DONE! ${videos.length} videos → ${csvFile}`);
    await browser.close();

  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
  }
})();