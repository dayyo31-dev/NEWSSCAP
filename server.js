require('dotenv').config();
const express = require('express');
const path = require('path');
const cron = require('node-cron');
const { initDB } = require('./db/client');
const { scrapeKeywords } = require('./scraper/index');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/articles', require('./routes/articles'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/crawl', async (req, res) => {
  try {
    const count = await scrapeKeywords();
    res.json({ success: true, count });
  } catch (err) {
    console.error('[crawl]', err);
    res.status(500).json({ error: err.message });
  }
});

async function start() {
  await initDB();
  console.log('[DB] 초기화 완료');

  // 서버 시작 시 최초 1회 크롤링
  scrapeKeywords().catch(console.error);

  // 6시간마다 자동 크롤링
  cron.schedule('0 */6 * * *', () => {
    console.log('[CRON] 정기 크롤링 시작');
    scrapeKeywords().catch(console.error);
  });

  app.listen(PORT, () => {
    console.log(`[서버] http://localhost:${PORT} 에서 실행 중`);
  });
}

start().catch((err) => {
  console.error('[시작 오류]', err);
  process.exit(1);
});
