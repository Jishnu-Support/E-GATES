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
      ALTER TABLE associations ADD COLUMN IF NOT EXISTS scrolling_announcement TEXT;
      ALTER TABLE associations ADD COLUMN IF NOT EXISTS is_scrolling_active BOOLEAN DEFAULT true;
      ALTER TABLE associations ADD COLUMN IF NOT EXISTS code VARCHAR(50);
      try {
        const missingCodes = await pgPool.query("SELECT id, name FROM associations WHERE code IS NULL OR code = ''");
        if (missingCodes.rows.length > 0) {
          const { generateAssociationCode } = require('../utils/generateAssociationCode');
          for (const assoc of missingCodes.rows) {
            const genCode = await generateAssociationCode(assoc.name, pgPool);
            await pgPool.query('UPDATE associations SET code = $1 WHERE id = $2', [genCode, assoc.id]);
          }
        }
      } catch (backfillErr) {
        console.warn('Association code backfill notice:', backfillErr.message);
      }
      CREATE UNIQUE INDEX IF NOT EXISTS idx_associations_code ON associations(code);
      ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_poll_id_user_id_key;
      ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_poll_id_user_id_unique;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_poll_user_vendor ON votes(poll_id, user_id, vendor_id);
      ALTER TABLE sos_alerts DROP CONSTRAINT IF EXISTS sos_alerts_emergency_type_check;
      ALTER TABLE sos_alerts DROP CONSTRAINT IF EXISTS sos_alerts_association_id_fkey;
      ALTER TABLE sos_alerts ADD CONSTRAINT sos_alerts_association_id_fkey FOREIGN KEY (association_id) REFERENCES associations(id) ON DELETE CASCADE;
      ALTER TABLE sos_contacts DROP CONSTRAINT IF EXISTS sos_contacts_contact_type_check;
      ALTER TABLE event_captures ALTER COLUMN file_size TYPE BIGINT;
      ALTER TABLE documents ALTER COLUMN file_type TYPE VARCHAR(255);
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'member', 'vendor'));
      ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_category VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_address TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_phone VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_logo VARCHAR(500);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS business_hours VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS shop_description TEXT;
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        association_id INTEGER REFERENCES associations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        price DECIMAL(10, 2) NOT NULL,
        discount_price DECIMAL(10, 2),
        unit VARCHAR(50) DEFAULT 'piece',
        image VARCHAR(500),
        in_stock BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);
      CREATE INDEX IF NOT EXISTS idx_products_assoc ON products(association_id);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

      CREATE TABLE IF NOT EXISTS property_listings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        association_id INTEGER REFERENCES associations(id) ON DELETE CASCADE,
        listing_type VARCHAR(20) NOT NULL CHECK (listing_type IN ('sale', 'rent', 'lease')),
        property_type VARCHAR(50) NOT NULL DEFAULT 'Independent House',
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(12, 2) NOT NULL,
        price_negotiable BOOLEAN DEFAULT true,
        maintenance_charges DECIMAL(10, 2) DEFAULT 0,
        bhk VARCHAR(20),
        bathrooms INTEGER DEFAULT 1,
        built_up_sqft INTEGER,
        plot_sqft INTEGER,
        facing VARCHAR(30),
        door_number VARCHAR(100),
        location_address TEXT,
        city VARCHAR(100),
        contact_person VARCHAR(150) NOT NULL,
        contact_phone VARCHAR(20) NOT NULL,
        contact_email VARCHAR(255),
        images TEXT DEFAULT '[]',
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'sold', 'rented')),
        rejection_reason TEXT,
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        is_featured BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_property_user ON property_listings(user_id);
      CREATE INDEX IF NOT EXISTS idx_property_assoc ON property_listings(association_id);
      CREATE INDEX IF NOT EXISTS idx_property_status ON property_listings(status);
      CREATE INDEX IF NOT EXISTS idx_property_listing_type ON property_listings(listing_type);

      CREATE TABLE IF NOT EXISTS advertisements (
        id SERIAL PRIMARY KEY,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        creator_role VARCHAR(20) NOT NULL DEFAULT 'super_admin',
        association_id INTEGER REFERENCES associations(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        tagline VARCHAR(255),
        description TEXT,
        banner_image VARCHAR(500) NOT NULL,
        target_panel VARCHAR(20) NOT NULL DEFAULT 'both' CHECK (target_panel IN ('both', 'member', 'admin')),
        action_type VARCHAR(20) NOT NULL DEFAULT 'link' CHECK (action_type IN ('link', 'whatsapp', 'call')),
        action_url VARCHAR(500),
        action_text VARCHAR(100) DEFAULT 'Learn More',
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'rejected')),
        rejection_reason TEXT,
        reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        start_date DATE,
        end_date DATE,
        click_count INTEGER DEFAULT 0,
        impression_count INTEGER DEFAULT 0,
        priority INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_ads_created_by ON advertisements(created_by);
      CREATE INDEX IF NOT EXISTS idx_ads_assoc ON advertisements(association_id);
      CREATE INDEX IF NOT EXISTS idx_ads_status ON advertisements(status);
      CREATE INDEX IF NOT EXISTS idx_ads_target_panel ON advertisements(target_panel);

      ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT 'image';
      ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS video_url VARCHAR(500);
      ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS distance VARCHAR(50);
      ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS location_name VARCHAR(255);
      ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS store_url VARCHAR(500);

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM advertisements LIMIT 1) THEN
          INSERT INTO advertisements (
            created_by, creator_role, association_id, title, tagline, description, banner_image,
            target_panel, action_type, action_url, action_text, status, click_count, impression_count, priority
          ) VALUES 
          (
            1, 'super_admin', NULL,
            'D-MART Supermarket • Daily Essentials & Fresh Groceries',
            'Flat 15% OFF on monthly grocery bundles & farm fresh dairy with free 30-min doorstep delivery!',
            'Exclusive layout partnership with verified resident discounts.',
            'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
            'both', 'whatsapp', '9876543210', 'Order on WhatsApp', 'active', 18, 164, 10
          ),
          (
            1, 'super_admin', NULL,
            'Smart RFID Boom Barriers & Automated Gates',
            'Automated vehicle recognition, digital visitor passes, and 24/7 technical support by Jishnu Infotech.',
            'Modernize layout entrance security with automated contactless access control.',
            'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=1200&q=80',
            'both', 'call', '9566823219', 'Call Specialist', 'active', 12, 115, 8
          ),
          (
            1, 'super_admin', NULL,
            'Verified Home Maintenance • Electrician, Plumbing & AC',
            'Certified layout technicians ready at your doorstep within 45 minutes. Transparent pricing & warranty.',
            'Emergency electrical fixes, pipe leakage repair, and deep home cleaning.',
            'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
            'both', 'call', '9876543210', 'Book Technician', 'active', 9, 92, 6
          );
        END IF;
      END $$;
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
