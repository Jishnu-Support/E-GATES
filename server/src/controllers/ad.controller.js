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
 * @desc Get active advertisements for public/resident/admin display
 * @route GET /api/v1/ads/active
 * @access Public / Authenticated
 */
exports.getActive = async (req, res, next) => {
  try {
    const { panel = 'both', association_id } = req.query;

    const conditions = ["ad.status = 'active'"];
    const params = [];
    let pIdx = 1;

    // Filter by target panel ('member', 'admin', or 'both')
    if (panel === 'member' || panel === 'admin') {
      conditions.push(`(ad.target_panel = 'both' OR ad.target_panel = $${pIdx++})`);
      params.push(panel);
    }

    // Filter by association: platform-wide ads (association_id IS NULL) + layout-specific ads
    if (association_id && !isNaN(association_id)) {
      conditions.push(`(ad.association_id IS NULL OR ad.association_id = $${pIdx++})`);
      params.push(parseInt(association_id, 10));
    }

    const query = `
      SELECT 
        ad.*,
        u.name as creator_name,
        u.shop_name,
        u.shop_category,
        u.shop_phone,
        u.shop_logo,
        assoc.name as association_name,
        assoc.code as association_code
      FROM advertisements ad
      LEFT JOIN users u ON ad.created_by = u.id
      LEFT JOIN associations assoc ON ad.association_id = assoc.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ad.priority DESC, ad.created_at DESC
      LIMIT 15
    `;

    const result = await pool.query(query, params);
    const ads = result.rows;

    // Asynchronously record impressions
    if (ads.length > 0) {
      const ids = ads.map((a) => a.id);
      pool.query(
        `UPDATE advertisements SET impression_count = impression_count + 1 WHERE id = ANY($1::int[])`,
        [ids]
      ).catch(() => {
        // Fallback for sqlite / embeddedDb where ANY array might not be supported
        try {
          ids.forEach((id) => {
            pool.query(`UPDATE advertisements SET impression_count = impression_count + 1 WHERE id = $1`, [id]).catch(() => {});
          });
        } catch (_) {}
      });
    }

    return res.json({
      success: true,
      data: ads,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Record ad click count
 * @route PATCH /api/v1/ads/:id/click
 * @access Public / Authenticated
 */
exports.recordClick = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE advertisements SET click_count = click_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    return res.json({
      success: true,
      message: 'Click recorded',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get pending advertisement campaigns (Super Admin only)
 * @route GET /api/v1/ads/pending
 * @access Private (Super Admin)
 */
exports.getPending = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        ad.*,
        u.name as vendor_name,
        u.email as vendor_email,
        u.phone as vendor_phone,
        u.shop_name,
        u.shop_category,
        u.shop_address,
        assoc.name as association_name,
        assoc.code as association_code
      FROM advertisements ad
      LEFT JOIN users u ON ad.created_by = u.id
      LEFT JOIN associations assoc ON ad.association_id = assoc.id
      WHERE ad.status = 'pending'
      ORDER BY ad.created_at DESC
    `;

    const result = await pool.query(query);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get all advertisements with stats (Super Admin only)
 * @route GET /api/v1/ads
 * @access Private (Super Admin)
 */
exports.getAll = async (req, res, next) => {
  try {
    const { status, target_panel, association_id } = req.query;

    const conditions = [];
    const params = [];
    let pIdx = 1;

    if (status && status !== 'all') {
      conditions.push(`ad.status = $${pIdx++}`);
      params.push(status);
    }

    if (target_panel && target_panel !== 'all') {
      conditions.push(`ad.target_panel = $${pIdx++}`);
      params.push(target_panel);
    }

    if (association_id && !isNaN(association_id)) {
      conditions.push(`ad.association_id = $${pIdx++}`);
      params.push(parseInt(association_id, 10));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        ad.*,
        u.name as creator_name,
        u.email as creator_email,
        u.phone as creator_phone,
        u.shop_name,
        assoc.name as association_name,
        assoc.code as association_code,
        rev.name as reviewer_name
      FROM advertisements ad
      LEFT JOIN users u ON ad.created_by = u.id
      LEFT JOIN associations assoc ON ad.association_id = assoc.id
      LEFT JOIN users rev ON ad.reviewed_by = rev.id
      ${whereClause}
      ORDER BY ad.created_at DESC
    `;

    const result = await pool.query(query, params);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Get current vendor / user advertisements
 * @route GET /api/v1/ads/my-ads
 * @access Private (Vendor / Super Admin)
 */
exports.getMyAds = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        ad.*,
        assoc.name as association_name,
        assoc.code as association_code
      FROM advertisements ad
      LEFT JOIN associations assoc ON ad.association_id = assoc.id
      WHERE ad.created_by = $1
      ORDER BY ad.created_at DESC
    `;

    const result = await pool.query(query, [req.user.id]);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Create new advertisement / submit ad campaign request
 * @route POST /api/v1/ads
 * @access Private (Super Admin or Vendor)
 */
exports.create = async (req, res, next) => {
  try {
    const {
      title,
      tagline,
      description,
      target_panel = 'both',
      action_type = 'link',
      action_url,
      action_text = 'Learn More',
      association_id,
      start_date,
      end_date,
      priority = 0,
      media_type = 'image',
      video_url,
      distance,
      location_name,
      store_url,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Campaign title is required',
      });
    }

    // Determine banner image and video file from req.files or req.file
    const bannerFile = req.files?.banner_image?.[0] || req.file;
    const videoFile = req.files?.video_file?.[0];

    let bannerPath = bannerFile
      ? (bannerFile.path ? bannerFile.path.replace(/\\/g, '/').replace(/^.*\/uploads\//, 'uploads/') : `uploads/ads/${bannerFile.filename}`)
      : (req.body.banner_image || null);

    let finalVideoUrl = videoFile
      ? (videoFile.path ? videoFile.path.replace(/\\/g, '/').replace(/^.*\/uploads\//, 'uploads/') : `uploads/ads/${videoFile.filename}`)
      : (video_url ? video_url.trim() : null);

    const isVideo = media_type === 'video' || Boolean(finalVideoUrl);
    const finalMediaType = isVideo ? 'video' : 'image';

    if (!bannerPath && !isVideo) {
      return res.status(400).json({
        success: false,
        message: 'Ad banner creative image is required for picture ads',
      });
    }

    // Default fallback banner if video ad has no separate poster
    if (!bannerPath && isVideo) {
      bannerPath = 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80';
    }

    if (isVideo && !finalVideoUrl) {
      finalVideoUrl = '/ads/sample-ad-video.mp4';
    }

    const isSuperAdmin = req.user.role === 'super_admin';
    const initialStatus = isSuperAdmin ? 'active' : 'pending';

    // Target association: Super Admin can choose any or NULL (all); Vendor defaults to their own or NULL if cross-layout
    let targetAssocId = null;
    if (association_id && !isNaN(association_id) && association_id !== '' && association_id !== '0') {
      targetAssocId = parseInt(association_id, 10);
    } else if (!isSuperAdmin && req.user.association_id) {
      targetAssocId = req.user.association_id;
    }

    const insertQuery = `
      INSERT INTO advertisements (
        created_by,
        creator_role,
        association_id,
        title,
        tagline,
        description,
        banner_image,
        target_panel,
        action_type,
        action_url,
        action_text,
        status,
        start_date,
        end_date,
        priority,
        media_type,
        video_url,
        distance,
        location_name,
        store_url,
        click_count,
        impression_count,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const values = [
      req.user.id,
      req.user.role,
      targetAssocId,
      title.trim(),
      tagline ? tagline.trim() : null,
      description ? description.trim() : null,
      bannerPath,
      ['both', 'member', 'admin'].includes(target_panel) ? target_panel : 'both',
      ['link', 'whatsapp', 'call'].includes(action_type) ? action_type : 'link',
      action_url ? action_url.trim() : null,
      action_text ? action_text.trim() : 'Learn More',
      initialStatus,
      start_date || null,
      end_date || null,
      parseInt(priority, 10) || 0,
      finalMediaType,
      finalVideoUrl,
      distance ? distance.trim() : null,
      location_name ? location_name.trim() : null,
      store_url ? store_url.trim() : null,
    ];

    const result = await pool.query(insertQuery, values);
    const newAd = result.rows[0];

    // If submitted by Vendor, notify Super Admin
    if (!isSuperAdmin) {
      try {
        const saRes = await pool.query("SELECT id FROM users WHERE role = 'super_admin'");
        for (const sa of saRes.rows) {
          await pool.query(
            `INSERT INTO notifications (user_id, title, message, type, link)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              sa.id,
              'New Vendor Ad Campaign Request',
              `Vendor "${req.user.shop_name || req.user.name}" submitted campaign "${title.trim()}" for review.`,
              'info',
              '/super-admin/ads'
            ]
          ).catch(() => {});
        }
      } catch (notifyErr) {
        console.warn('Super Admin ad notification error:', notifyErr.message);
      }
    }

    await logAudit(
      req.user.id,
      isSuperAdmin ? 'AD_CREATED' : 'AD_REQUEST_SUBMITTED',
      'advertisement',
      newAd.id,
      { title: newAd.title, status: newAd.status },
      req.ip
    );

    return res.status(201).json({
      success: true,
      message: isSuperAdmin
        ? 'Advertisement posted and live across selected portals successfully.'
        : 'Ad campaign request submitted successfully! It will be reviewed by the Super Admin.',
      data: newAd,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Approve vendor ad request (Super Admin only)
 * @route PATCH /api/v1/ads/:id/approve
 * @access Private (Super Admin)
 */
exports.approve = async (req, res, next) => {
  try {
    const { id } = req.params;

    const findRes = await pool.query('SELECT * FROM advertisements WHERE id = $1', [id]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement campaign not found',
      });
    }

    const ad = findRes.rows[0];

    const updateRes = await pool.query(
      `UPDATE advertisements 
       SET status = 'active',
           reviewed_by = $1,
           reviewed_at = CURRENT_TIMESTAMP,
           rejection_reason = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [req.user.id, id]
    );

    const updatedAd = updateRes.rows[0];

    // Notify vendor
    try {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          ad.created_by,
          'Ad Campaign Approved!',
          `Your advertisement campaign "${ad.title}" has been approved by the Super Admin and is now live!`,
          'success',
          '/vendor/ads'
        ]
      );
    } catch (e) {
      console.warn('Vendor notification error:', e.message);
    }

    await logAudit(req.user.id, 'AD_APPROVED', 'advertisement', id, { title: ad.title }, req.ip);

    return res.json({
      success: true,
      message: 'Advertisement campaign approved and published live.',
      data: updatedAd,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Reject vendor ad request (Super Admin only)
 * @route PATCH /api/v1/ads/:id/reject
 * @access Private (Super Admin)
 */
exports.reject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const findRes = await pool.query('SELECT * FROM advertisements WHERE id = $1', [id]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement campaign not found',
      });
    }

    const ad = findRes.rows[0];

    const updateRes = await pool.query(
      `UPDATE advertisements 
       SET status = 'rejected',
           rejection_reason = $1,
           reviewed_by = $2,
           reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [reason || 'Ad creative does not meet platform community guidelines.', req.user.id, id]
    );

    const updatedAd = updateRes.rows[0];

    // Notify vendor
    try {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          ad.created_by,
          'Ad Campaign Update: Needs Revision',
          `Your advertisement "${ad.title}" was not approved: ${reason || 'Does not meet guidelines.'}`,
          'warning',
          '/vendor/ads'
        ]
      );
    } catch (e) {
      console.warn('Vendor notification error:', e.message);
    }

    await logAudit(req.user.id, 'AD_REJECTED', 'advertisement', id, { title: ad.title, reason }, req.ip);

    return res.json({
      success: true,
      message: 'Advertisement campaign marked as rejected.',
      data: updatedAd,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Toggle advertisement status (active <-> paused)
 * @route PATCH /api/v1/ads/:id/toggle-status
 * @access Private (Super Admin or Ad Creator)
 */
exports.toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const findRes = await pool.query('SELECT * FROM advertisements WHERE id = $1', [id]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found',
      });
    }

    const ad = findRes.rows[0];

    // Authorization check
    if (req.user.role !== 'super_admin' && ad.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to modify this advertisement',
      });
    }

    const newStatus = ad.status === 'active' ? 'paused' : 'active';

    const updateRes = await pool.query(
      `UPDATE advertisements SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [newStatus, id]
    );

    return res.json({
      success: true,
      message: `Advertisement status changed to ${newStatus}.`,
      data: updateRes.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Delete advertisement
 * @route DELETE /api/v1/ads/:id
 * @access Private (Super Admin or Ad Creator)
 */
exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const findRes = await pool.query('SELECT * FROM advertisements WHERE id = $1', [id]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found',
      });
    }

    const ad = findRes.rows[0];

    // Authorization check
    if (req.user.role !== 'super_admin' && ad.created_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this advertisement',
      });
    }

    await pool.query('DELETE FROM advertisements WHERE id = $1', [id]);

    await logAudit(req.user.id, 'AD_DELETED', 'advertisement', id, { title: ad.title }, req.ip);

    return res.json({
      success: true,
      message: 'Advertisement deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};
