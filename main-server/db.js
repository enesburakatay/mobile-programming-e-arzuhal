const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'mobile_programming',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'EnesPassword',
});

// Create tables on startup
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id              TEXT PRIMARY KEY,
      username        VARCHAR(100) UNIQUE NOT NULL,
      email           VARCHAR(255) UNIQUE NOT NULL,
      password_hash   TEXT NOT NULL,
      first_name      VARCHAR(100) DEFAULT '',
      last_name       VARCHAR(100) DEFAULT '',
      tc_kimlik       VARCHAR(11) DEFAULT '',
      verified        BOOLEAN DEFAULT FALSE,
      verify_method   VARCHAR(50) DEFAULT '',
      disclaimer_accepted BOOLEAN DEFAULT FALSE,
      created_at      TIMESTAMP DEFAULT NOW(),
      updated_at      TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id                      TEXT PRIMARY KEY,
      owner_id                TEXT NOT NULL REFERENCES users(id),
      title                   TEXT NOT NULL,
      type                    VARCHAR(50) DEFAULT 'OTHER',
      content                 TEXT DEFAULT '',
      amount                  VARCHAR(100) DEFAULT '',
      status                  VARCHAR(50) DEFAULT 'DRAFT',
      counterparty_name       VARCHAR(200) DEFAULT '',
      counterparty_role       VARCHAR(200) DEFAULT '',
      counterparty_tc_kimlik  VARCHAR(11) DEFAULT '',
      counterparty_user_id    TEXT DEFAULT '',
      created_at              TIMESTAMP DEFAULT NOW(),
      updated_at              TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('  Database tables initialized.');
}

module.exports = { pool, initDB };
