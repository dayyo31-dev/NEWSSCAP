require('dotenv').config();
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

async function initDB() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS articles (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      title     TEXT NOT NULL,
      content   TEXT,
      url       TEXT UNIQUE NOT NULL,
      source    TEXT,
      keyword   TEXT,
      published_at TEXT,
      created_at   TEXT DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC)
  `);
}

module.exports = { db, initDB };
