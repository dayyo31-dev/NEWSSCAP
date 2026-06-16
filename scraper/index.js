const Parser = require('rss-parser');
const { db } = require('../db/client');

const parser = new Parser({
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
  timeout: 10000,
});

const BASE_KEYWORDS = ['코나아이', '코나카드', '코나페이', 'Konai'];

function parseSource(title) {
  const match = title?.match(/ - ([^-]+)$/);
  return match ? match[1].trim() : null;
}

function cleanTitle(title) {
  return title?.replace(/ - [^-]+$/, '').trim() || title;
}

async function scrapeKeyword(keyword) {
  const query = encodeURIComponent(keyword);
  const feedUrl = `https://news.google.com/rss/search?q=${query}&hl=ko&gl=KR&ceid=KR:ko`;

  const feed = await parser.parseURL(feedUrl);
  let inserted = 0;

  for (const item of feed.items) {
    const title = cleanTitle(item.title || '');
    const source = item.source?._ || parseSource(item.title) || 'Google News';
    const url = item.link || item.guid || '';
    const content = item.contentSnippet || item.content || '';
    const publishedAt = item.pubDate || item.isoDate || new Date().toISOString();

    if (!title || !url) continue;

    try {
      const result = await db.execute({
        sql: `INSERT OR IGNORE INTO articles (title, content, url, source, keyword, published_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [title, content, url, source, keyword, publishedAt],
      });
      if (result.rowsAffected > 0) inserted++;
    } catch (err) {
      if (!err.message?.includes('UNIQUE')) {
        console.error(`[scraper] insert error: ${err.message}`);
      }
    }
  }

  return inserted;
}

async function scrapeKeywords(keywords = BASE_KEYWORDS) {
  let total = 0;
  for (const kw of keywords) {
    try {
      const n = await scrapeKeyword(kw);
      console.log(`[scraper] "${kw}" → ${n}건 추가`);
      total += n;
    } catch (err) {
      console.error(`[scraper] "${kw}" 실패: ${err.message}`);
    }
  }
  console.log(`[scraper] 총 ${total}건 추가 완료`);
  return total;
}

module.exports = { scrapeKeywords, scrapeKeyword, BASE_KEYWORDS };
