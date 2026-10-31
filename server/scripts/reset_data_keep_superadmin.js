const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const config = require('../src/config/env');

async function cleanDataKeepSuperAdmin() {
  console.log('--- STARTING FRESH DATABASE RESET (KEEPING SUPER ADMIN ONLY) ---');

  const tablesToClear = [
    'event_captures',
    'tenants',
    'family_members',
    'votes',
    'poll_vendors',
    'polls',
    'news_posts',
    'complaints',
    'maintenance_fees',
    'events',
    'documents',
    'sos_alerts',
    'sos_contacts',
    'notifications',
    'audit_log',
    'refresh_tokens',
  ];

  for (const table of tablesToClear) {
    try {
      await pool.query(`DELETE FROM ${table}`);
      console.log(`✓ Cleared table: ${table}`);
    } catch (err) {
      console.warn(`! Table ${table} notice:`, err.message);
    }
  }

  // Clear non-super-admin users
  try {
    await pool.query("DELETE FROM users WHERE role != 'super_admin'");
    console.log(`✓ Cleared non-superadmin users`);
  } catch (err) {
    console.warn(`! Failed to clear users:`, err.message);
  }

  // Detach super admin from any old association
  try {
    await pool.query("UPDATE users SET association_id = NULL WHERE role = 'super_admin'");
    console.log(`✓ Reset Super Admin association link`);
  } catch (err) {
    console.warn(`! Failed to reset super admin association:`, err.message);
  }

  // Clear associations
  try {
    await pool.query('DELETE FROM associations');
    console.log(`✓ Cleared associations`);
  } catch (err) {
    console.warn(`! Failed to clear associations:`, err.message);
  }

  // Clean uploaded media files, keeping .gitkeep in each directory
  const uploadsDir = config.attachmentsPath || path.resolve(__dirname, '../uploads');
  if (fs.existsSync(uploadsDir)) {
    const subdirs = ['audio', 'documents', 'events', 'logos', 'news', 'profiles', 'proofs', 'voting'];
    for (const sub of subdirs) {
      const fullSub = path.join(uploadsDir, sub);
      if (fs.existsSync(fullSub)) {
        const files = fs.readdirSync(fullSub);
        for (const file of files) {
          if (file !== '.gitkeep') {
            try {
              fs.unlinkSync(path.join(fullSub, file));
            } catch (e) {
              console.warn(`Could not delete file ${file}:`, e.message);
            }
          }
        }
      }
    }
    console.log(`✓ Cleaned uploaded media files from server/uploads`);
  }

  // Ensure default super admins exist with active passwords
  try {
    const salt1 = await bcrypt.genSalt(10);
    const superAdminPassHash = await bcrypt.hash('SuperAdmin@123', salt1);

    const checkDefault = await pool.query("SELECT id FROM users WHERE email = $1", ['superadmin@association.com']);
    if (checkDefault.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (name, email, phone, password_hash, role, status, member_code)
         VALUES ($1, $2, $3, $4, 'super_admin', 'approved', '000001')`,
        ['Super Admin', 'superadmin@association.com', '9999999999', superAdminPassHash]
      );
      console.log('✓ Created default superadmin account (superadmin@association.com)');
    } else {
      await pool.query(
        `UPDATE users SET password_hash = $1, status = 'approved', role = 'super_admin' WHERE id = $2`,
        [superAdminPassHash, checkDefault.rows[0].id]
      );
      console.log('✓ Updated default superadmin account (superadmin@association.com)');
    }

    const jitUsername = config.seedAdmin?.username || 'jit_admin';
    const jitPassword = config.seedAdmin?.password || 'Jishnuinfotech@123';
    const jitPhone = config.seedAdmin?.phone || '9566823219';
    const jitEmail = jitUsername.includes('@') ? jitUsername.toLowerCase() : `${jitUsername.toLowerCase()}@jishnuinfotech.com`;

    const salt2 = await bcrypt.genSalt(10);
    const jitPassHash = await bcrypt.hash(jitPassword, salt2);

    const checkJit = await pool.query("SELECT id FROM users WHERE email = $1 OR name = $2", [jitEmail, jitUsername]);
    if (checkJit.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (name, email, phone, password_hash, role, status, member_code)
         VALUES ($1, $2, $3, $4, 'super_admin', 'approved', '000002')`,
        [jitUsername, jitEmail, jitPhone, jitPassHash]
      );
      console.log(`✓ Created jit superadmin account (${jitUsername} / ${jitEmail})`);
    } else {
      await pool.query(
        `UPDATE users SET password_hash = $1, status = 'approved', role = 'super_admin', phone = $2 WHERE id = $3`,
        [jitPassHash, jitPhone, checkJit.rows[0].id]
      );
      console.log(`✓ Updated jit superadmin account (${jitUsername} / ${jitEmail})`);
    }
  } catch (saErr) {
    console.warn('! Notice ensuring superadmin credentials:', saErr.message);
  }

  // Verification query
  const remainingUsers = await pool.query('SELECT id, name, email, phone, role FROM users');
  console.log('\n--- VERIFICATION: REMAINING USERS ---');
  console.table(remainingUsers.rows);

  const assocCount = await pool.query('SELECT COUNT(*) as count FROM associations');
  console.log('Remaining Associations:', assocCount.rows[0]);

  console.log('\n✓ Clean database reset completed successfully!');
  return {
    success: true,
    users: remainingUsers.rows,
    associations: assocCount.rows[0]
  };
}

if (require.main === module) {
  cleanDataKeepSuperAdmin()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal error during reset:', err);
      process.exit(1);
    });
}

module.exports = { cleanDataKeepSuperAdmin };
