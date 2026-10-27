const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const config = require('./env');
const { getEmbeddedDb, saveDb } = require('./embeddedDb');

let useFallback = false;
let loggedFallback = false;
let pgInitialized = false;

async function initPostgresSchemaAndSeed() {
  if (pgInitialized) return;
  pgInitialized = true;
  try {
    // Ensure all tables and relations exist (all statements in schema.sql are IF NOT EXISTS)
    console.log('[PostgreSQL]: Verifying and initializing database schema from schema.sql...');
    const schemaPath = path.resolve(__dirname, '../schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pgPool.query(schemaSql);
      console.log('[PostgreSQL]: Database schema successfully ensured.');
    }

    // Ensure all required columns exist on tables (in case table was previously created without them)
    await pgPool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo VARCHAR(500);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_number VARCHAR(20);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_main_admin BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS eb_bill_proof VARCHAR(500);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS property_tax_receipt VARCHAR(500);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS member_code VARCHAR(50);
      ALTER TABLE users ALTER COLUMN member_code TYPE VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS disabled_emergencies JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE associations ADD COLUMN IF NOT EXISTS main_admin_id INTEGER;
      ALTER TABLE associations ADD COLUMN IF NOT EXISTS logo VARCHAR(500);
      ALTER TABLE polls ADD COLUMN IF NOT EXISTS poll_type VARCHAR(50) DEFAULT 'vendor_selection';
      ALTER TABLE polls ADD COLUMN IF NOT EXISTS service_category VARCHAR(100);
      ALTER TABLE polls ADD COLUMN IF NOT EXISTS resolution_task_type VARCHAR(100);
      ALTER TABLE polls ADD COLUMN IF NOT EXISTS target_audience VARCHAR(50) DEFAULT 'all';
      ALTER TABLE polls ADD COLUMN IF NOT EXISTS target_street VARCHAR(255);
      ALTER TABLE polls ADD COLUMN IF NOT EXISTS target_user_ids TEXT;
      ALTER TABLE polls ADD COLUMN IF NOT EXISTS election_type VARCHAR(50);
      ALTER TABLE polls ADD COLUMN IF NOT EXISTS internal_officer_name VARCHAR(255);
      ALTER TABLE polls ADD COLUMN IF NOT EXISTS internal_officer_contact VARCHAR(100);
      ALTER TABLE polls ADD COLUMN IF NOT EXISTS external_officer_name VARCHAR(255);
      ALTER TABLE polls ADD COLUMN IF NOT EXISTS external_officer_contact VARCHAR(100);
      ALTER TABLE polls ADD COLUMN IF NOT EXISTS election_roles TEXT;
      ALTER TABLE poll_vendors ADD COLUMN IF NOT EXISTS contesting_role VARCHAR(255);
      ALTER TABLE news_posts ADD COLUMN IF NOT EXISTS voice_message VARCHAR(500);
      ALTER TABLE news_posts ADD COLUMN IF NOT EXISTS attachment VARCHAR(500);
      ALTER TABLE news_posts ADD COLUMN IF NOT EXISTS image VARCHAR(500);
      ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_poll_id_user_id_key;
      ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_poll_id_user_id_unique;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_poll_user_vendor ON votes(poll_id, user_id, vendor_id);
      ALTER TABLE sos_alerts DROP CONSTRAINT IF EXISTS sos_alerts_emergency_type_check;
      ALTER TABLE sos_contacts DROP CONSTRAINT IF EXISTS sos_contacts_contact_type_check;
      ALTER TABLE event_captures ALTER COLUMN file_size TYPE BIGINT;
    `);

    // 2. Ensure Super Admin exists matching seedAdmin configuration
    const seedUsername = config.seedAdmin?.username || 'jit_admin';
    const seedPassword = config.seedAdmin?.password || 'Jishnuinfotech@123';
    const seedPhone = config.seedAdmin?.phone || '9566823219';
    const seedEmail = seedUsername.includes('@')
      ? seedUsername.toLowerCase()
      : `${seedUsername.toLowerCase()}@jishnuinfotech.com`;

    const saCheck = await pgPool.query(
      "SELECT id, email, name FROM users WHERE role = 'super_admin' LIMIT 1"
    );

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(seedPassword, salt);

    if (saCheck.rows.length === 0) {
      console.log(`[PostgreSQL]: Seeding Super Admin account (${seedUsername} / ${seedEmail})...`);
      await pgPool.query(
        `INSERT INTO users (name, email, phone, password_hash, role, status, member_code)
         VALUES ($1, $2, $3, $4, 'super_admin', 'approved', '000001')
         ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             name = EXCLUDED.name,
             phone = EXCLUDED.phone,
             status = 'approved'`,
        [seedUsername, seedEmail, seedPhone, hash]
      );
      console.log('[PostgreSQL]: Super Admin created successfully.');
    } else {
      const existing = saCheck.rows[0];
      await pgPool.query(
        `UPDATE users
         SET password_hash = $1, name = $2, phone = $3
         WHERE id = $4`,
        [hash, seedUsername, seedPhone, existing.id]
      );
    }
  } catch (err) {
    console.warn('[PostgreSQL Auto-Init Notice]:', err.message);
  }
}

const pgPool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.nodeEnv === 'production' && !config.databaseUrl.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pgPool.on('connect', () => {
  useFallback = false;
  loggedFallback = false;
  initPostgresSchemaAndSeed().catch(() => {});
});

pgPool.on('error', (err) => {
  if (err.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED') || err.message.includes('connect')) {
    useFallback = true;
    if (!loggedFallback) {
      console.log('[Database Notice]: PostgreSQL not reachable on port 5432. Active embedded database fallback enabled.');
      loggedFallback = true;
    }
  } else {
    console.error('[Database Pool Error]:', err.message);
  }
});

/**
 * Execute query against embedded SQLite database with PG compatibility
 */
async function executeEmbeddedQuery(sql, params = []) {
  const db = await getEmbeddedDb();

  // Convert PostgreSQL specific syntax to SQLite compatible syntax
  let sqliteSql = sql
    .replace(/NOW\(\)\s*-\s*INTERVAL\s*'(\d+)\s*days?'/gi, "datetime('now', '-$1 days')")
    .replace(/NOW\(\)\s*-\s*INTERVAL\s*'(\d+)\s*hours?'/gi, "datetime('now', '-$1 hours')")
    .replace(/NOW\(\)\s*-\s*INTERVAL\s*'(\d+)\s*minutes?'/gi, "datetime('now', '-$1 minutes')")
    .replace(/NOW\(\)/gi, "datetime('now')")
    .replace(/COUNT\s*\(\s*DISTINCT\s+([^)]+)\)\s+FILTER\s*\(\s*WHERE\s+([^)]+)\)/gi, 'COUNT(DISTINCT CASE WHEN $2 THEN $1 END)')
    .replace(/COUNT\s*\(\s*([^)]+)\)\s+FILTER\s*\(\s*WHERE\s+([^)]+)\)/gi, 'COUNT(CASE WHEN $2 THEN $1 END)')
    .replace(/STRING_AGG\s*\(\s*DISTINCT\s+([^,]+)\s*,\s*('[^']+')\s*\)/gi, 'GROUP_CONCAT(DISTINCT $1)')
    .replace(/STRING_AGG\s*\(\s*([^,]+)\s*,\s*('[^']+')\s*\)/gi, 'GROUP_CONCAT($1, $2)')
    .replace(/TIMESTAMPTZ/gi, 'TEXT')
    .replace(/ILIKE/gi, 'LIKE')
    .replace(/\bis_active\s*=\s*true\b/gi, 'is_active = 1')
    .replace(/\bis_active\s*=\s*false\b/gi, 'is_active = 0')
    .replace(/\bTRUE\b/gi, '1')
    .replace(/\bFALSE\b/gi, '0')
    .replace(/::(text|varchar|integer|int|bigint|date)/gi, '')
    .trim();

  // Replace $1, $2, etc with ?1, ?2 so SQLite reuses positional parameters
  sqliteSql = sqliteSql.replace(/\$(\d+)/g, '?$1');

  // Sanitize parameters for SQLite (convert Date to ISO string, boolean to integer)
  const sanitizedParams = (params || []).map((p) => {
    if (p instanceof Date) return p.toISOString();
    if (typeof p === 'boolean') return p ? 1 : 0;
    return p;
  });

  const isSelect = /^\s*SELECT/i.test(sqliteSql);
  const isReturning = /RETURNING/i.test(sqliteSql);

  try {
    if (isSelect || isReturning) {
      const stmt = db.prepare(sqliteSql);
      if (sanitizedParams && sanitizedParams.length > 0) {
        stmt.bind(sanitizedParams);
      }
      const rows = [];
      while (stmt.step()) {
        const obj = stmt.getAsObject();
        // Normalize COUNT(*) to count for PG compatibility
        if (obj['COUNT(*)'] !== undefined && obj.count === undefined) {
          obj.count = obj['COUNT(*)'];
        }
        if (obj['count(*)'] !== undefined && obj.count === undefined) {
          obj.count = obj['count(*)'];
        }
        rows.push(obj);
      }
      stmt.free();

      // If it was an insert/update with returning, save to disk
      if (!isSelect) {
        saveDb(db);
      }

      return {
        rows,
        rowCount: rows.length,
      };
    } else {
      // Direct execution for INSERT, UPDATE, DELETE without returning
      if (sanitizedParams && sanitizedParams.length > 0) {
        const stmt = db.prepare(sqliteSql);
        stmt.bind(sanitizedParams);
        stmt.step();
        stmt.free();
      } else {
        db.run(sqliteSql);
      }

      saveDb(db);
      return {
        rows: [],
        rowCount: db.getRowsModified(),
      };
    }
  } catch (err) {
    console.error('[EmbeddedDB Query Error]:', err.message, 'SQL:', sqliteSql);
    throw err;
  }
}

/**
 * Dual-Mode Database Query Wrapper
 */
const db = {
  async query(text, params) {
    if (!useFallback) {
      if (!pgInitialized) {
        await initPostgresSchemaAndSeed().catch(() => {});
      }
      try {
        return await pgPool.query(text, params);
      } catch (err) {
        // If PostgreSQL connection fails, seamlessly switch to embedded DB
        if (err.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED') || err.message.includes('connect')) {
          useFallback = true;
          if (!loggedFallback) {
            console.log('[Database Notice]: Switched to embedded database due to PostgreSQL unavailability.');
            loggedFallback = true;
          }
          return executeEmbeddedQuery(text, params);
        }
        throw err;
      }
    }

    // When in fallback, test PostgreSQL to see if it has become available
    try {
      const res = await pgPool.query(text, params);
      useFallback = false;
      loggedFallback = false;
      console.log('[Database Notice]: Reconnected to PostgreSQL database successfully.');
      return res;
    } catch (pgErr) {
      if (pgErr.code === 'ECONNREFUSED' || pgErr.message.includes('ECONNREFUSED') || pgErr.message.includes('connect')) {
        return executeEmbeddedQuery(text, params);
      }
      useFallback = false;
      throw pgErr;
    }
  },

  async connect() {
    if (useFallback) {
      return {
        query: (text, params) => executeEmbeddedQuery(text, params),
        release: () => {},
      };
    }

    try {
      return await pgPool.connect();
    } catch (err) {
      useFallback = true;
      return {
        query: (text, params) => executeEmbeddedQuery(text, params),
        release: () => {},
      };
    }
  },

  on(event, handler) {
    pgPool.on(event, handler);
  },

  async end() {
    try {
      await pgPool.end();
    } catch (err) {
      // ignore
    }
  },

  initPostgresSchemaAndSeed,
};

module.exports = db;
