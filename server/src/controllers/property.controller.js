const pool = require('../config/db');

// Helper to log audit events
const logAudit = async (userId, action, entityType, entityId, details, ipAddress) => {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, entityType, entityId, JSON.stringify(details || {}), ipAddress || null]
    );
  } catch (err) {
    console.warn('Audit log write error:', err.message);
  }
};

/**
 * Helper to parse images field safely
 */
const parseImages = (images) => {
  if (!images) return [];
  if (Array.isArray(images)) return images;
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    return typeof images === 'string' && images.trim() ? [images] : [];
  }
};

/**
 * @desc Get all approved property listings across all associations
 * @route GET /api/v1/properties
 * @access Public / Authenticated
 */
exports.getAll = async (req, res, next) => {
  try {
    const {
      listing_type,
      property_type,
      association_id,
      bhk,
      search,
      min_price,
      max_price,
      sort,
      page = 1,
      limit = 30
    } = req.query;

    const conditions = ["pl.status = 'approved'"];
    const params = [];
    let pIdx = 1;

    if (listing_type && ['sale', 'rent', 'lease'].includes(listing_type.toLowerCase())) {
      conditions.push(`pl.listing_type = $${pIdx++}`);
      params.push(listing_type.toLowerCase());
    }

    if (property_type && property_type !== 'all') {
      conditions.push(`LOWER(pl.property_type) = LOWER($${pIdx++})`);
      params.push(property_type);
    }

    if (association_id && !isNaN(association_id)) {
      conditions.push(`pl.association_id = $${pIdx++}`);
      params.push(parseInt(association_id, 10));
    }

    if (bhk && bhk !== 'all') {
      conditions.push(`LOWER(pl.bhk) = LOWER($${pIdx++})`);
      params.push(bhk);
    }

    if (min_price && !isNaN(min_price)) {
      conditions.push(`pl.price >= $${pIdx++}`);
      params.push(parseFloat(min_price));
    }

    if (max_price && !isNaN(max_price)) {
      conditions.push(`pl.price <= $${pIdx++}`);
      params.push(parseFloat(max_price));
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      conditions.push(
        `(LOWER(pl.title) LIKE $${pIdx} OR LOWER(pl.description) LIKE $${pIdx} OR LOWER(pl.location_address) LIKE $${pIdx} OR LOWER(pl.city) LIKE $${pIdx} OR LOWER(a.name) LIKE $${pIdx})`
      );
      params.push(term);
      pIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'pl.created_at DESC';
    if (sort === 'price_asc') orderBy = 'pl.price ASC';
    else if (sort === 'price_desc') orderBy = 'pl.price DESC';
    else if (sort === 'oldest') orderBy = 'pl.created_at ASC';

    const countQuery = `
      SELECT COUNT(*) as total
      FROM property_listings pl
      LEFT JOIN associations a ON pl.association_id = a.id
      ${whereClause}
    `;
    const countRes = await pool.query(countQuery, params);
    const total = parseInt(countRes.rows[0]?.total || 0, 10);

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const query = `
      SELECT 
        pl.*,
        a.name as association_name,
        a.code as association_code,
        a.city as association_city,
        u.name as owner_name,
        u.email as owner_email,
        u.phone as owner_phone,
        u.member_code as owner_member_code
      FROM property_listings pl
      LEFT JOIN associations a ON pl.association_id = a.id
      LEFT JOIN users u ON pl.user_id = u.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${pIdx++} OFFSET $${pIdx++}
    `;
    params.push(parseInt(limit, 10), offset);

    const result = await pool.query(query, params);
    const items = result.rows.map((row) => ({
      ...row,
      images: parseImages(row.images),
      price_negotiable: Boolean(row.price_negotiable),
      is_featured: Boolean(row.is_featured)
    }));

    return res.json({
      success: true,
      data: items,
      meta: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)) || 1
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get all pending property listings awaiting Super Admin approval
 * @route GET /api/v1/properties/pending
 * @access Private (Super Admin only)
 */
exports.getPending = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        pl.*,
        a.name as association_name,
        a.code as association_code,
        a.city as association_city,
        u.name as owner_name,
        u.email as owner_email,
        u.phone as owner_phone,
        u.member_code as owner_member_code
      FROM property_listings pl
      LEFT JOIN associations a ON pl.association_id = a.id
      LEFT JOIN users u ON pl.user_id = u.id
      WHERE pl.status = 'pending'
      ORDER BY pl.created_at DESC
    `;
    const result = await pool.query(query);
    const items = result.rows.map((row) => ({
      ...row,
      images: parseImages(row.images),
      price_negotiable: Boolean(row.price_negotiable)
    }));

    return res.json({
      success: true,
      data: items,
      count: items.length
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get property listings created by the currently logged-in user
 * @route GET /api/v1/properties/my-listings
 * @access Private (Member / Admin / Super Admin)
 */
exports.getMyListings = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        pl.*,
        a.name as association_name,
        a.code as association_code,
        a.city as association_city
      FROM property_listings pl
      LEFT JOIN associations a ON pl.association_id = a.id
      WHERE pl.user_id = $1
      ORDER BY pl.created_at DESC
    `;
    const result = await pool.query(query, [req.user.id]);
    const items = result.rows.map((row) => ({
      ...row,
      images: parseImages(row.images),
      price_negotiable: Boolean(row.price_negotiable)
    }));

    return res.json({
      success: true,
      data: items
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get property listing details by ID
 * @route GET /api/v1/properties/:id
 * @access Public / Authenticated
 */
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        pl.*,
        a.name as association_name,
        a.code as association_code,
        a.city as association_city,
        u.name as owner_name,
        u.email as owner_email,
        u.phone as owner_phone,
        u.member_code as owner_member_code
      FROM property_listings pl
      LEFT JOIN associations a ON pl.association_id = a.id
      LEFT JOIN users u ON pl.user_id = u.id
      WHERE pl.id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Property listing not found'
      });
    }

    const row = result.rows[0];
    return res.json({
      success: true,
      data: {
        ...row,
        images: parseImages(row.images),
        price_negotiable: Boolean(row.price_negotiable),
        is_featured: Boolean(row.is_featured)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Create a new house for sale / rent listing (defaults to pending Super Admin approval)
 * @route POST /api/v1/properties
 * @access Private (Authenticated Member / Admin)
 */
exports.create = async (req, res, next) => {
  try {
    const {
      listing_type = 'sale',
      property_type = 'Independent House',
      title,
      description,
      price,
      price_negotiable = true,
      maintenance_charges = 0,
      bhk,
      bathrooms = 1,
      built_up_sqft,
      plot_sqft,
      facing,
      door_number,
      location_address,
      city,
      contact_person,
      contact_phone,
      contact_email,
      association_id
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Property title is required' });
    }

    if (!price || isNaN(price) || parseFloat(price) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid price or monthly rent is required' });
    }

    const cleanListingType = ['sale', 'rent', 'lease'].includes(String(listing_type).toLowerCase())
      ? String(listing_type).toLowerCase()
      : 'sale';

    // Target association: user's association or submitted association_id
    const targetAssocId = association_id && !isNaN(association_id)
      ? parseInt(association_id, 10)
      : req.user.association_id || null;

    // Process uploaded photos
    let uploadedImages = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      uploadedImages = req.files.map((file) => `/uploads/properties/${file.filename}`);
    } else if (req.file) {
      uploadedImages = [`/uploads/properties/${req.file.filename}`];
    } else if (req.body.image_url) {
      uploadedImages = [req.body.image_url];
    }

    const resolvedContactPerson = (contact_person && contact_person.trim()) || req.user.name || 'Owner';
    const resolvedContactPhone = (contact_phone && contact_phone.trim()) || req.user.phone || '';
    const resolvedContactEmail = (contact_email && contact_email.trim()) || req.user.email || '';
    const resolvedCity = (city && city.trim()) || req.user.association_city || '';

    // If Super Admin creates a listing, it is automatically approved; otherwise pending
    const initialStatus = req.user.role === 'super_admin' ? 'approved' : 'pending';

    const insertQuery = `
      INSERT INTO property_listings (
        user_id,
        association_id,
        listing_type,
        property_type,
        title,
        description,
        price,
        price_negotiable,
        maintenance_charges,
        bhk,
        bathrooms,
        built_up_sqft,
        plot_sqft,
        facing,
        door_number,
        location_address,
        city,
        contact_person,
        contact_phone,
        contact_email,
        images,
        status,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const values = [
      req.user.id,
      targetAssocId,
      cleanListingType,
      property_type.trim(),
      title.trim(),
      description ? description.trim() : '',
      parseFloat(price),
      price_negotiable === 'false' || price_negotiable === false ? false : true,
      maintenance_charges ? parseFloat(maintenance_charges) : 0,
      bhk ? bhk.trim() : null,
      bathrooms ? parseInt(bathrooms, 10) : 1,
      built_up_sqft ? parseInt(built_up_sqft, 10) : null,
      plot_sqft ? parseInt(plot_sqft, 10) : null,
      facing ? facing.trim() : null,
      door_number ? door_number.trim() : req.user.door_number || null,
      location_address ? location_address.trim() : null,
      resolvedCity,
      resolvedContactPerson,
      resolvedContactPhone,
      resolvedContactEmail,
      JSON.stringify(uploadedImages),
      initialStatus
    ];

    const result = await pool.query(insertQuery, values);
    const newProperty = result.rows[0];

    // Notify Super Admin if pending
    if (initialStatus === 'pending') {
      try {
        const saRes = await pool.query("SELECT id FROM users WHERE role = 'super_admin'");
        for (const sa of saRes.rows) {
          await pool.query(
            `INSERT INTO notifications (user_id, title, message, type, link)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              sa.id,
              'New House/Property Listing Awaiting Approval',
              `Resident "${resolvedContactPerson}" submitted "${title.trim()}" (${cleanListingType.toUpperCase()}) for layout review.`,
              'info',
              '/super-admin/approvals'
            ]
          ).catch(() => {});
        }
      } catch (notifyErr) {
        console.warn('Super Admin property notification error:', notifyErr);
      }
    }

    await logAudit(
      req.user.id,
      'CREATE_PROPERTY_LISTING',
      'property_listings',
      newProperty.id,
      { title: newProperty.title, listing_type: newProperty.listing_type, status: initialStatus },
      req.ip
    );

    return res.status(201).json({
      success: true,
      message:
        initialStatus === 'approved'
          ? 'Property listing created and published live!'
          : 'Your property has been submitted! It will be published across all layout associations once approved by the Super Admin.',
      data: {
        ...newProperty,
        images: uploadedImages
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Approve a pending property listing (Super Admin only)
 * @route PUT /api/v1/properties/:id/approve
 * @access Private (Super Admin only)
 */
exports.approve = async (req, res, next) => {
  try {
    const { id } = req.params;

    const findRes = await pool.query(
      `SELECT pl.*, u.name as owner_name, u.email as owner_email
       FROM property_listings pl
       LEFT JOIN users u ON pl.user_id = u.id
       WHERE pl.id = $1`,
      [id]
    );

    if (findRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Property listing not found' });
    }

    const listing = findRes.rows[0];

    const updateQuery = `
      UPDATE property_listings
      SET status = 'approved',
          rejection_reason = NULL,
          reviewed_by = $1,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [req.user.id, id]);
    const updated = result.rows[0];

    // Send notification to listing owner
    try {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          listing.user_id,
          'Property Listing Approved!',
          `Your property listing "${listing.title}" has been approved by the Master Super Admin and is now live across all layout associations.`,
          'success',
          '/member/properties'
        ]
      ).catch(() => {});
    } catch (notifErr) {
      console.warn('Owner notification error:', notifErr);
    }

    await logAudit(
      req.user.id,
      'APPROVE_PROPERTY_LISTING',
      'property_listings',
      id,
      { title: listing.title, owner_id: listing.user_id },
      req.ip
    );

    return res.json({
      success: true,
      message: `Property listing "${listing.title}" is approved and published to all associations!`,
      data: {
        ...updated,
        images: parseImages(updated.images)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Reject a pending property listing (Super Admin only)
 * @route PUT /api/v1/properties/:id/reject
 * @access Private (Super Admin only)
 */
exports.reject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Property details do not meet community listing standards.' } = req.body;

    const findRes = await pool.query('SELECT * FROM property_listings WHERE id = $1', [id]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Property listing not found' });
    }

    const listing = findRes.rows[0];

    const updateQuery = `
      UPDATE property_listings
      SET status = 'rejected',
          rejection_reason = $1,
          reviewed_by = $2,
          reviewed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [reason, req.user.id, id]);
    const updated = result.rows[0];

    // Send notification to listing owner
    try {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          listing.user_id,
          'Property Listing Not Approved',
          `Your property listing "${listing.title}" was rejected: "${reason}". You can update details and resubmit.`,
          'warning',
          '/member/properties'
        ]
      ).catch(() => {});
    } catch (notifErr) {
      console.warn('Owner rejection notification error:', notifErr);
    }

    await logAudit(
      req.user.id,
      'REJECT_PROPERTY_LISTING',
      'property_listings',
      id,
      { title: listing.title, reason },
      req.ip
    );

    return res.json({
      success: true,
      message: `Property listing "${listing.title}" was rejected.`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Update listing status (e.g. mark as 'sold', 'rented', or toggle back to 'approved')
 * @route PATCH /api/v1/properties/:id/status
 * @access Private (Owner or Super Admin)
 */
exports.markStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['approved', 'sold', 'rented', 'pending'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid property status' });
    }

    const findRes = await pool.query('SELECT * FROM property_listings WHERE id = $1', [id]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Property listing not found' });
    }

    const listing = findRes.rows[0];

    // Authorization check
    if (req.user.role !== 'super_admin' && listing.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this property' });
    }

    const updateQuery = `
      UPDATE property_listings
      SET status = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [status, id]);
    const updated = result.rows[0];

    return res.json({
      success: true,
      message: `Property status marked as "${status.toUpperCase()}".`,
      data: {
        ...updated,
        images: parseImages(updated.images)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Delete property listing
 * @route DELETE /api/v1/properties/:id
 * @access Private (Owner or Super Admin)
 */
exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const findRes = await pool.query('SELECT * FROM property_listings WHERE id = $1', [id]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Property listing not found' });
    }

    const listing = findRes.rows[0];

    // Authorization check
    if (req.user.role !== 'super_admin' && listing.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this property' });
    }

    await pool.query('DELETE FROM property_listings WHERE id = $1', [id]);

    await logAudit(
      req.user.id,
      'DELETE_PROPERTY_LISTING',
      'property_listings',
      id,
      { title: listing.title },
      req.ip
    );

    return res.json({
      success: true,
      message: 'Property listing successfully deleted.'
    });
  } catch (err) {
    next(err);
  }
};
