/**
 * Dynamic Calendar Festivals, Government Holidays, and Bank Holidays Generator
 * Generates official Gazetted Holidays, Tamil Nadu / Indian Festivals, and
 * 2nd & 4th Saturday Bank Holidays automatically for any given year (2025, 2026, 2027, 2028...).
 */

// Moveable festival dates lookup table
const MOVEABLE_FESTIVALS = {
  2025: {
    maha_shivaratri: { month: 1, day: 26 },
    holi: { month: 2, day: 14 },
    ugadi: { month: 2, day: 30 },
    eid_ul_fitr: { month: 2, day: 31 },
    good_friday: { month: 3, day: 18 },
    bakrid: { month: 5, day: 7 },
    muharram: { month: 5, day: 27 },
    krishna_jayanti: { month: 7, day: 16 },
    ganesh_chaturthi: { month: 7, day: 27 },
    milad_un_nabi: { month: 8, day: 5 },
    ayudha_pooja: { month: 9, day: 1 },
    vijayadashami: { month: 9, day: 2 },
    deepavali: { month: 9, day: 20 },
    guru_nanak_jayanti: { month: 10, day: 5 },
  },
  2026: {
    maha_shivaratri: { month: 1, day: 15 },
    holi: { month: 2, day: 4 },
    ugadi: { month: 2, day: 19 },
    eid_ul_fitr: { month: 2, day: 20 },
    good_friday: { month: 3, day: 3 },
    bakrid: { month: 4, day: 27 },
    muharram: { month: 5, day: 17 },
    milad_un_nabi: { month: 7, day: 26 },
    krishna_jayanti: { month: 8, day: 4 },
    ganesh_chaturthi: { month: 8, day: 14 },
    ayudha_pooja: { month: 9, day: 19 },
    vijayadashami: { month: 9, day: 20 },
    deepavali: { month: 10, day: 8 },
    guru_nanak_jayanti: { month: 10, day: 24 },
  },
  2027: {
    maha_shivaratri: { month: 2, day: 6 },
    eid_ul_fitr: { month: 2, day: 10 },
    holi: { month: 2, day: 22 },
    good_friday: { month: 2, day: 26 },
    ugadi: { month: 3, day: 7 },
    bakrid: { month: 4, day: 17 },
    muharram: { month: 5, day: 6 },
    milad_un_nabi: { month: 7, day: 15 },
    krishna_jayanti: { month: 7, day: 25 },
    ganesh_chaturthi: { month: 8, day: 4 },
    ayudha_pooja: { month: 9, day: 9 },
    vijayadashami: { month: 9, day: 10 },
    deepavali: { month: 9, day: 29 },
    guru_nanak_jayanti: { month: 10, day: 14 },
  },
  2028: {
    maha_shivaratri: { month: 1, day: 23 },
    eid_ul_fitr: { month: 1, day: 27 },
    holi: { month: 2, day: 11 },
    ugadi: { month: 2, day: 27 },
    good_friday: { month: 3, day: 14 },
    bakrid: { month: 4, day: 5 },
    muharram: { month: 4, day: 26 },
    milad_un_nabi: { month: 7, day: 4 },
    krishna_jayanti: { month: 7, day: 13 },
    ganesh_chaturthi: { month: 7, day: 24 },
    ayudha_pooja: { month: 8, day: 28 },
    vijayadashami: { month: 8, day: 29 },
    deepavali: { month: 9, day: 17 },
    guru_nanak_jayanti: { month: 10, day: 2 },
  },
};

/**
 * Get all 2nd and 4th Saturday Bank Holidays for every month of the year
 */
export function getMonthlyBankHolidays(year) {
  const bankHolidays = [];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  for (let m = 0; m < 12; m++) {
    const saturdays = [];
    const d = new Date(year, m, 1);
    while (d.getMonth() === m) {
      if (d.getDay() === 6) {
        saturdays.push(new Date(d));
      }
      d.setDate(d.getDate() + 1);
    }

    // 2nd Saturday (index 1)
    if (saturdays[1]) {
      const date = saturdays[1];
      date.setHours(9, 0, 0, 0);
      bankHolidays.push({
        id: `bank-sat2-${year}-${m + 1}`,
        title: `Bank Holiday (2nd Saturday - ${monthNames[m]})`,
        short_title: '2nd Saturday Bank Holiday',
        event_date: date.toISOString(),
        category: 'bank_holiday',
        badge: 'Bank Holiday',
        location: 'All Public & Commercial Banks',
        description: `Official RBI / IBA Bank Holiday for 2nd Saturday of ${monthNames[m]} ${year}. All commercial and public sector bank branches remain closed.`,
        is_system: true,
      });
    }

    // 4th Saturday (index 3)
    if (saturdays[3]) {
      const date = saturdays[3];
      date.setHours(9, 0, 0, 0);
      bankHolidays.push({
        id: `bank-sat4-${year}-${m + 1}`,
        title: `Bank Holiday (4th Saturday - ${monthNames[m]})`,
        short_title: '4th Saturday Bank Holiday',
        event_date: date.toISOString(),
        category: 'bank_holiday',
        badge: 'Bank Holiday',
        location: 'All Public & Commercial Banks',
        description: `Official RBI / IBA Bank Holiday for 4th Saturday of ${monthNames[m]} ${year}. All bank branches remain closed.`,
        is_system: true,
      });
    }
  }

  return bankHolidays;
}

/**
 * Generate full year festivals and government holidays
 */
export function getYearFestivalsAndHolidays(year) {
  const list = [];
  const moveables = MOVEABLE_FESTIVALS[year] || MOVEABLE_FESTIVALS[2026];

  const makeDate = (month, day, hours = 9) => {
    return new Date(year, month, day, hours, 0, 0).toISOString();
  };

  // 1. FIXED GAZETTED GOVERNMENT HOLIDAYS & NATIONAL DAYS
  list.push(
    {
      id: `gov-newyear-${year}`,
      title: "New Year's Day Celebration",
      short_title: "New Year's Day",
      event_date: makeDate(0, 1),
      category: 'govt_holiday',
      badge: 'Public Holiday',
      location: 'Community Hall & Layout Grounds',
      description: 'Official New Year celebration and community gathering.',
      is_system: true,
    },
    {
      id: `fest-pongal-${year}`,
      title: 'Pongal / Makar Sankranti',
      short_title: 'Pongal Festival',
      event_date: makeDate(0, 14),
      category: 'festival',
      badge: 'Harvest Festival',
      location: 'Community Center / Layout Ground',
      description: 'Traditional harvest festival, community sweet Pongal cooking and traditional rangoli/kolam.',
      is_system: true,
    },
    {
      id: `gov-mattu-pongal-${year}`,
      title: 'Mattu Pongal / Thiruvalluvar Day',
      short_title: 'Mattu Pongal',
      event_date: makeDate(0, 15),
      category: 'govt_holiday',
      badge: 'Tamil Govt Holiday',
      location: 'Tamil Nadu & Layout Association',
      description: 'Tamil Nadu Gazetted Holiday honoring Saint Thiruvalluvar and agrarian thanksgiving.',
      is_system: true,
    },
    {
      id: `gov-uzhavar-thirunal-${year}`,
      title: 'Uzhavar Thirunal / Kaanum Pongal',
      short_title: 'Uzhavar Thirunal',
      event_date: makeDate(0, 16),
      category: 'govt_holiday',
      badge: 'Tamil Govt Holiday',
      location: 'Layout Community Park',
      description: 'Community reunion and cultural games celebrating farmers and nature.',
      is_system: true,
    },
    {
      id: `gov-republic-day-${year}`,
      title: 'Republic Day Celebration & Flag Hoisting',
      short_title: 'Republic Day (National Holiday)',
      event_date: makeDate(0, 26, 8),
      category: 'govt_holiday',
      badge: 'National Holiday',
      location: 'Layout Park Flagpost',
      description: 'Gazetted National Holiday: 76th+ Republic Day flag hoisting, national anthem, and distribution of sweets.',
      is_system: true,
    },
    {
      id: `gov-tamil-newyear-${year}`,
      title: 'Tamil New Year (Puthandu) & Dr. B.R. Ambedkar Jayanti',
      short_title: 'Tamil New Year & Ambedkar Jayanti',
      event_date: makeDate(3, 14),
      category: 'govt_holiday',
      badge: 'Gazetted Holiday',
      location: 'Community Hall',
      description: 'Celebration of Tamil Puthandu (Chithirai 1) and Dr. B.R. Ambedkar Jayanti with cultural programs.',
      is_system: true,
    },
    {
      id: `gov-may-day-${year}`,
      title: 'May Day / International Workers Day',
      short_title: 'May Day',
      event_date: makeDate(4, 1),
      category: 'govt_holiday',
      badge: 'Public Holiday',
      location: 'All India & Tamil Nadu',
      description: 'Gazetted Public Holiday honoring workers and maintenance team staff.',
      is_system: true,
    },
    {
      id: `gov-independence-day-${year}`,
      title: 'Independence Day Celebration & Sports Meet',
      short_title: 'Independence Day (National Holiday)',
      event_date: makeDate(7, 15, 8),
      category: 'govt_holiday',
      badge: 'National Holiday',
      location: 'Main Association Gate & Grounds',
      description: 'Gazetted National Holiday: Tricolor Flag Hoisting, community address, kids sports games and prize distribution.',
      is_system: true,
    },
    {
      id: `gov-gandhi-jayanti-${year}`,
      title: 'Mahatma Gandhi Jayanti & Cleanliness Drive',
      short_title: 'Gandhi Jayanti (National Holiday)',
      event_date: makeDate(9, 2, 7),
      category: 'govt_holiday',
      badge: 'National Holiday',
      location: 'Community Layout Streets & Parks',
      description: 'Gazetted National Holiday: Swachh Community sanitation drive and floral tributes.',
      is_system: true,
    },
    {
      id: `fest-christmas-eve-${year}`,
      title: 'Christmas Eve & Carol Gathering',
      short_title: 'Christmas Eve',
      event_date: makeDate(11, 24, 18),
      category: 'festival',
      badge: 'Celebration',
      location: 'Community Hall',
      description: 'Carol singing, Christmas tree lighting, and festive sweets exchange.',
      is_system: true,
    },
    {
      id: `fest-christmas-${year}`,
      title: 'Christmas Celebration & Feast',
      short_title: 'Christmas Day',
      event_date: makeDate(11, 25),
      category: 'festival',
      badge: 'Gazetted Holiday',
      location: 'Community Center',
      description: 'Gazetted Holiday: Christmas festivities and gift sharing for layout children.',
      is_system: true,
    },
    {
      id: `fest-nye-${year}`,
      title: 'New Year Eve Community Countdown',
      short_title: "New Year's Eve",
      event_date: makeDate(11, 31, 20),
      category: 'festival',
      badge: 'Celebration',
      location: 'Layout Clubhouse / Ground',
      description: 'Year-end community potluck dinner and midnight welcome countdown.',
      is_system: true,
    }
  );

  // 2. MOVEABLE FESTIVALS ACCORDING TO LUNISOLAR CALENDAR
  if (moveables.maha_shivaratri) {
    list.push({
      id: `fest-shivaratri-${year}`,
      title: 'Maha Shivaratri',
      short_title: 'Maha Shivaratri',
      event_date: makeDate(moveables.maha_shivaratri.month, moveables.maha_shivaratri.day, 18),
      category: 'festival',
      badge: 'Hindu Festival',
      location: 'Layout Temple / Community Hall',
      description: 'Night-long cultural bhajans, prayers, and community prasadam distribution.',
      is_system: true,
    });
  }

  if (moveables.holi) {
    list.push({
      id: `fest-holi-${year}`,
      title: 'Holi - Festival of Colors',
      short_title: 'Holi',
      event_date: makeDate(moveables.holi.month, moveables.holi.day, 10),
      category: 'festival',
      badge: 'Cultural Festival',
      location: 'Layout Central Ground',
      description: 'Community celebration with organic eco-friendly colors, music, and festive sweets.',
      is_system: true,
    });
  }

  if (moveables.ugadi) {
    list.push({
      id: `fest-ugadi-${year}`,
      title: 'Ugadi / Telugu & Kannada New Year',
      short_title: 'Ugadi',
      event_date: makeDate(moveables.ugadi.month, moveables.ugadi.day),
      category: 'festival',
      badge: 'New Year Festival',
      location: 'Community Hall',
      description: 'Ugadi celebrations, Panchanga Sravanam, and sweet distribution for residents.',
      is_system: true,
    });
  }

  if (moveables.eid_ul_fitr) {
    list.push({
      id: `fest-eid-fitr-${year}`,
      title: 'Eid-ul-Fitr (Ramzan Festival)',
      short_title: 'Eid-ul-Fitr',
      event_date: makeDate(moveables.eid_ul_fitr.month, moveables.eid_ul_fitr.day),
      category: 'festival',
      badge: 'Gazetted Holiday',
      location: 'All India & Tamil Nadu',
      description: 'Islamic festival marking the culmination of the holy fasting month of Ramadan.',
      is_system: true,
    });
  }

  if (moveables.good_friday) {
    list.push({
      id: `fest-good-friday-${year}`,
      title: 'Good Friday Observance',
      short_title: 'Good Friday',
      event_date: makeDate(moveables.good_friday.month, moveables.good_friday.day),
      category: 'govt_holiday',
      badge: 'Gazetted Holiday',
      location: 'All India & Tamil Nadu',
      description: 'Gazetted Holiday commemorating the Passion and Crucifixion of Jesus Christ.',
      is_system: true,
    });
  }

  if (moveables.bakrid) {
    list.push({
      id: `fest-bakrid-${year}`,
      title: 'Bakrid / Eid al-Adha',
      short_title: 'Bakrid',
      event_date: makeDate(moveables.bakrid.month, moveables.bakrid.day),
      category: 'festival',
      badge: 'Gazetted Holiday',
      location: 'All India & Tamil Nadu',
      description: 'Sacred Islamic festival of sacrifice and community benevolence.',
      is_system: true,
    });
  }

  if (moveables.muharram) {
    list.push({
      id: `fest-muharram-${year}`,
      title: 'Muharram (Islamic New Year)',
      short_title: 'Muharram',
      event_date: makeDate(moveables.muharram.month, moveables.muharram.day),
      category: 'govt_holiday',
      badge: 'Gazetted Holiday',
      location: 'All India & Tamil Nadu',
      description: 'Gazetted Holiday marking the sacred first month of the Islamic lunar calendar.',
      is_system: true,
    });
  }

  if (moveables.milad_un_nabi) {
    list.push({
      id: `fest-milad-${year}`,
      title: 'Milad-un-Nabi (Eid-e-Milad)',
      short_title: 'Milad-un-Nabi',
      event_date: makeDate(moveables.milad_un_nabi.month, moveables.milad_un_nabi.day),
      category: 'festival',
      badge: 'Gazetted Holiday',
      location: 'All India & Tamil Nadu',
      description: 'Birth anniversary of Prophet Muhammad observed with peace and prayers.',
      is_system: true,
    });
  }

  if (moveables.krishna_jayanti) {
    list.push({
      id: `fest-krishna-jayanti-${year}`,
      title: 'Krishna Jayanti / Gokulashtami',
      short_title: 'Krishna Jayanti',
      event_date: makeDate(moveables.krishna_jayanti.month, moveables.krishna_jayanti.day, 16),
      category: 'festival',
      badge: 'Cultural Festival',
      location: 'Layout Park Grounds',
      description: 'Traditional Uriyadi (pot-breaking), fancy dress for layout kids, and prasadam.',
      is_system: true,
    });
  }

  if (moveables.ganesh_chaturthi) {
    list.push({
      id: `fest-vinayagar-${year}`,
      title: 'Vinayagar / Ganesh Chaturthi',
      short_title: 'Ganesh Chaturthi',
      event_date: makeDate(moveables.ganesh_chaturthi.month, moveables.ganesh_chaturthi.day),
      category: 'festival',
      badge: 'Gazetted Holiday',
      location: 'Community Center / Temple',
      description: 'Eco-friendly clay Ganesha installation, special daily pooja, and modak distribution.',
      is_system: true,
    });
  }

  if (moveables.ayudha_pooja) {
    list.push({
      id: `fest-ayudha-pooja-${year}`,
      title: 'Ayudha Pooja & Saraswati Pooja',
      short_title: 'Ayudha Pooja',
      event_date: makeDate(moveables.ayudha_pooja.month, moveables.ayudha_pooja.day, 10),
      category: 'festival',
      badge: 'Gazetted Holiday',
      location: 'Gate Security, Pumps & Community Hall',
      description: 'Pooja for layout vehicles, maintenance equipment, water motors, and books.',
      is_system: true,
    });
  }

  if (moveables.vijayadashami) {
    list.push({
      id: `fest-vijayadashami-${year}`,
      title: 'Vijayadashami / Dussehra',
      short_title: 'Vijayadashami',
      event_date: makeDate(moveables.vijayadashami.month, moveables.vijayadashami.day),
      category: 'festival',
      badge: 'Gazetted Holiday',
      location: 'Community Hall',
      description: 'Celebration of truth, wisdom, and auspicious new beginnings (Vidyarambham).',
      is_system: true,
    });
  }

  if (moveables.deepavali) {
    list.push({
      id: `fest-deepavali-${year}`,
      title: 'Deepavali / Diwali - Festival of Lights',
      short_title: 'Deepavali (Diwali)',
      event_date: makeDate(moveables.deepavali.month, moveables.deepavali.day, 18),
      category: 'festival',
      badge: 'Gazetted Holiday',
      location: 'Entire Layout Community',
      description: 'Community diyas lighting, eco green fireworks display, and traditional sweets sharing.',
      is_system: true,
    });
  }

  if (moveables.guru_nanak_jayanti) {
    list.push({
      id: `fest-guru-nanak-${year}`,
      title: 'Guru Nanak Jayanti',
      short_title: 'Guru Nanak Jayanti',
      event_date: makeDate(moveables.guru_nanak_jayanti.month, moveables.guru_nanak_jayanti.day),
      category: 'festival',
      badge: 'Gazetted Holiday',
      location: 'All India',
      description: 'Prakash Utsav celebrating the birth of Guru Nanak Dev Ji.',
      is_system: true,
    });
  }

  // 3. COMBINE WITH ALL 12 MONTHS OF 2ND & 4TH SATURDAY BANK HOLIDAYS
  const bankHolidays = getMonthlyBankHolidays(year);

  // Return combined sorted array
  return [...list, ...bankHolidays].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );
}
