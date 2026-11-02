const defaultPool = require('../config/db');

/**
 * Generate a unique, memorable association code based on the association name.
 * Examples:
 * - "Hosur KCC Nagar House Owners Welfare Association" -> "KCC"
 * - "Green Valley Residents Welfare Association" -> "GVR" or "GVL"
 * - "Sunrise Layout Association" -> "SUN"
 *
 * @param {string} associationName - Name of the layout association
 * @param {Object} [dbClient] - pg Pool, Client, or embeddedDb wrapper
 * @returns {Promise<string>} Unique uppercase association code
 */
async function generateAssociationCode(associationName, dbClient = defaultPool) {
  if (!associationName || typeof associationName !== 'string') {
    associationName = 'Association';
  }

  const rawWords = associationName.trim().split(/\s+/);

  // 1. Check if there is an uppercase acronym word (2 to 5 letters), like "KCC"
  let baseCode = null;
  const acronymWord = rawWords.find((w) => {
    const lettersOnly = w.replace(/[^A-Za-z]/g, '');
    return lettersOnly.length >= 2 && lettersOnly.length <= 5 && lettersOnly === lettersOnly.toUpperCase();
  });

  if (acronymWord) {
    baseCode = acronymWord.replace(/[^A-Za-z]/g, '').toUpperCase();
  }

  // 2. If no acronym, extract initials from meaningful words
  if (!baseCode) {
    const ignoreList = new Set([
      'AND', '&', 'OF', 'THE', 'IN', 'FOR', 'AT', 'TO',
      'ASSOCIATION', 'WELFARE', 'SOCIETY', 'OWNERS', 'HOUSE', 'RESIDENTS'
    ]);

    const significantWords = rawWords
      .map((w) => w.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
      .filter((w) => w.length > 0 && !ignoreList.has(w));

    if (significantWords.length >= 2) {
      baseCode = significantWords.slice(0, 4).map((w) => w[0]).join('');
    } else if (significantWords.length === 1) {
      baseCode = significantWords[0].slice(0, 4);
    } else {
      const allWords = rawWords
        .map((w) => w.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
        .filter((w) => w.length > 0);
      baseCode = allWords.slice(0, 4).map((w) => w[0]).join('');
    }
  }

  if (!baseCode || baseCode.length < 2) {
    baseCode = associationName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || 'ASC';
  }

  baseCode = baseCode.toUpperCase();

  // 3. Ensure uniqueness in database
  let candidate = baseCode;
  let counter = 1;

  while (true) {
    try {
      const { rows } = await dbClient.query(
        'SELECT id FROM associations WHERE UPPER(code) = UPPER($1) LIMIT 1',
        [candidate]
      );
      if (!rows || rows.length === 0) {
        return candidate;
      }
      counter++;
      candidate = `${baseCode}${counter < 10 ? '0' + counter : counter}`;
    } catch (err) {
      console.warn('Error checking association code uniqueness:', err.message);
      return candidate;
    }
  }
}

module.exports = {
  generateAssociationCode,
};
