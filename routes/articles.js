const express = require('express');
const router = express.Router();
const { db } = require('../db/client');

router.get('/', async (req, res) => {
  const { q = '', page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  try {
    let rows, total;

    if (q.trim()) {
      const term = `%${q.trim()}%`;
      const [dataResult, countResult] = await Promise.all([
        db.execute({
          sql: `SELECT id, title, content, url, source, keyword, published_at
                FROM articles
                WHERE title LIKE ? OR content LIKE ?
                ORDER BY published_at DESC
                LIMIT ? OFFSET ?`,
          args: [term, term, limitNum, offset],
        }),
        db.execute({
          sql: `SELECT COUNT(*) AS total FROM articles WHERE title LIKE ? OR content LIKE ?`,
          args: [term, term],
        }),
      ]);
      rows = dataResult.rows;
      total = Number(countResult.rows[0].total);
    } else {
      const [dataResult, countResult] = await Promise.all([
        db.execute({
          sql: `SELECT id, title, content, url, source, keyword, published_at
                FROM articles
                ORDER BY published_at DESC
                LIMIT ? OFFSET ?`,
          args: [limitNum, offset],
        }),
        db.execute({ sql: `SELECT COUNT(*) AS total FROM articles`, args: [] }),
      ]);
      rows = dataResult.rows;
      total = Number(countResult.rows[0].total);
    }

    res.json({
      articles: rows,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error('[articles]', err);
    res.status(500).json({ error: '데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
