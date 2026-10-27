const defaultPool = require('../config/db');

/**
 * Generates a unique member code in format PREFIX-001 (e.g. RES-001, GRE-001).
 * Uses the first 3 letters of the association name + hyphen + 3-digit padded number.
 * @param {string|number|null} [associationIdOrName] - Association ID or Name
 * @param {Object} [dbClient] - Optional pg client or pool
 * @returns {Promise<string>} e.g. 'RES-001'
 */
async function generateMemberCode(associationIdOrName = null, dbClient = defaultPool) {
  let prefix = 'RES';

  if (associationIdOrName) {
    if (typeof associationIdOrName === 'string' && isNaN(Number(associationIdOrName))) {
      const letters = associationIdOrName.replace(/[^a-zA-Z]/g, '').toUpperCase();
      if (letters.length >= 3) {
        prefix = letters.slice(0, 3);
      } else if (letters.length > 0) {
        prefix = letters.padEnd(3, 'A');
      }
    } else if (Number(associationIdOrName) > 0) {
      try {
        const { rows } = await dbClient.query(
          'SELECT name FROM associations WHERE id = $1 LIMIT 1',
          [Number(associationIdOrName)]
        );
        if (rows.length > 0 && rows[0].name) {
          const letters = rows[0].name.replace(/[^a-zA-Z]/g, '').toUpperCase();
          if (letters.length >= 3) {
            prefix = letters.slice(0, 3);
          } else if (letters.length > 0) {
            prefix = letters.padEnd(3, 'A');
          }
        }
      } catch (e) {
        console.error('Error getting association name for member code:', e.message);
      }
    }
  }

  // Find the highest sequence number for this prefix
  try {
    const { rows } = await dbClient.query(
      `SELECT member_code FROM users WHERE member_code LIKE $1`,
      [`${prefix}-%`]
    );

    let maxSeq = 0;
    for (const r of rows) {
      if (r.member_code) {
        const parts = r.member_code.split('-');
        if (parts.length === 2) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    }

    const nextSeq = maxSeq + 1;
    return `${prefix}-${String(nextSeq).padStart(3, '0')}`;
  } catch (err) {
    console.error('Error generating sequential member code:', err.message);
    return `${prefix}-001`;
  }
}

module.exports = {
  generateMemberCode,
};
