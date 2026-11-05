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
    const { panel = 'both', association_id, city, district } = req.query;

    const conditions = ["ad.status = 'active' AND (ad.payment_status = 'paid' OR ad.payment_status IS NULL OR ad.creator_role = 'super_admin')"];
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

    // Filter by District basis (platform-wide / all districts OR matching district)
    const targetDistrict = district || req.user?.district;
    if (targetDistrict && targetDistrict.trim() && targetDistrict.toLowerCase() !== 'all') {
      conditions.push(`(ad.target_district IS NULL OR LOWER(ad.target_district) = 'all' OR LOWER(ad.target_district) = LOWER($${pIdx++}))`);
      params.push(targetDistrict.trim());
    }

    // Filter by City / Taluk basis (platform-wide / all cities OR matching city)
    const targetCity = city || req.user?.taluk || req.user?.layout_name;
    if (targetCity && targetCity.trim() && targetCity.toLowerCase() !== 'all') {
      conditions.push(`(ad.target_city IS NULL OR LOWER(ad.target_city) = 'all' OR LOWER(ad.target_city) = LOWER($${pIdx++}))`);
      params.push(targetCity.trim());
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
      association_id,
      start_date,
      end_date,
      priority = 0,
      video_url,
      distance,
      location_name,
      store_url,
      target_city,
      target_district,
      target_state = 'Tamil Nadu',
      payment_reference,
      payment_amount = 999,
      auto_activate = false,
      agent_id,
    } = req.body;

    const media_type = req.body.media_type || req.body.ad_type || (req.body.pricing_plan?.includes('video') ? 'video' : 'image');
    const target_panel = req.body.target_panel || req.body.placement || 'both';
    const action_type = req.body.action_type || req.body.cta_type || 'link';
    const action_url = req.body.action_url || req.body.cta_phone || req.body.cta_link || req.body.store_url || '';
    const action_text = req.body.action_text || (action_type === 'whatsapp' ? 'Order on WhatsApp' : action_type === 'call' ? 'Call Specialist' : 'Learn More');

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
      ? (bannerFile.path ? '/' + bannerFile.path.replace(/\\/g, '/').replace(/^.*\/uploads\//, 'uploads/') : `/uploads/ads/${bannerFile.filename}`)
      : (req.body.banner_image || null);

    let finalVideoUrl = videoFile
      ? (videoFile.path ? '/' + videoFile.path.replace(/\\/g, '/').replace(/^.*\/uploads\//, 'uploads/') : `/uploads/ads/${videoFile.filename}`)
      : (video_url ? video_url.trim() : null);

    const isVideo = media_type === 'video' || Boolean(finalVideoUrl) || req.body.ad_type === 'video';
    const finalMediaType = isVideo ? 'video' : 'image';

    if (isVideo && !finalVideoUrl) {
      finalVideoUrl = '/ads/sample-ad-video.mp4';
    }

    if (!bannerPath) {
      bannerPath = isVideo
        ? 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80'
        : 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80';
    }

    if (bannerPath && !bannerPath.startsWith('http://') && !bannerPath.startsWith('https://') && !bannerPath.startsWith('/')) {
      bannerPath = '/' + bannerPath;
    }
    if (finalVideoUrl && !finalVideoUrl.startsWith('http://') && !finalVideoUrl.startsWith('https://') && !finalVideoUrl.startsWith('/')) {
      finalVideoUrl = '/' + finalVideoUrl;
    }

    const isSuperAdmin = req.user.role === 'super_admin';
    const isInstantPay = auto_activate === true || auto_activate === 'true';

    // Payment status & ad initial status:
    // If Super Admin: automatically paid & active
    // If instant demo pay: automatically paid & active
    // If UTR reference provided: pending_verification & pending
    // Otherwise: unpaid & pending
    const initialPaymentStatus = isSuperAdmin || isInstantPay
      ? 'paid'
      : (payment_reference && payment_reference.trim() ? 'pending_verification' : 'unpaid');

    const initialStatus = (isSuperAdmin || isInstantPay) ? 'active' : 'pending';

    // Target association: Super Admin can choose any or NULL (all); Vendor defaults to their own or NULL if cross-layout
    let targetAssocId = null;
    if (association_id && !isNaN(association_id) && association_id !== '' && association_id !== '0') {
      targetAssocId = parseInt(association_id, 10);
    } else if (!isSuperAdmin && req.user.association_id) {
      targetAssocId = req.user.association_id;
    }

    const parsedAmount = parseFloat(payment_amount) || 999;
    const initialPaymentDate = (initialPaymentStatus === 'paid') ? new Date().toISOString() : null;

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
        target_city,
        target_district,
        target_state,
        payment_status,
        payment_reference,
        payment_amount,
        payment_date,
        agent_id,
        click_count,
        impression_count,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28,
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
      target_city ? target_city.trim() : null,
      target_district ? target_district.trim() : null,
      target_state ? target_state.trim() : 'Tamil Nadu',
      initialPaymentStatus,
      payment_reference ? payment_reference.trim() : null,
      parsedAmount,
      initialPaymentDate,
      agent_id ? parseInt(agent_id, 10) : (req.user.agent_id || null),
    ];

    let result;
    try {
      result = await pool.query(insertQuery, values);
    } catch (dbErr) {
      if (dbErr.message && (dbErr.message.includes('does not exist') || dbErr.message.includes('column') || dbErr.message.includes('inconsistent types'))) {
        console.warn('[Auto-Migration]: Ensuring advertisements columns exist in database...');
        await pool.query(`
          ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS target_city VARCHAR(100);
          ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS target_district VARCHAR(100);
          ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS target_state VARCHAR(100) DEFAULT 'Tamil Nadu';
          ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS pricing_plan VARCHAR(50) DEFAULT 'single_ad';
          ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'unpaid';
          ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);
          ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10,2) DEFAULT 0;
          ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;
          ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS payment_proof VARCHAR(500);
          ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS agent_id INTEGER;
          ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS media_type VARCHAR(20) DEFAULT 'image';
          ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS video_url VARCHAR(500);
          ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS distance VARCHAR(50);
          ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS location_name VARCHAR(255);
          ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS store_url VARCHAR(500);
        `).catch((migErr) => console.warn('[Auto-Migration Warn]:', migErr.message));

        result = await pool.query(insertQuery, values);
      } else {
        throw dbErr;
      }
    }
    const newAd = result.rows[0];

    // If submitted by Advertiser or Vendor, notify Super Admin
    if (!isSuperAdmin) {
      try {
        const saRes = await pool.query("SELECT id FROM users WHERE role = 'super_admin'");
        const roleLabel = req.user.role === 'advertiser' ? 'Ad Company' : 'Vendor';
        const senderName = req.user.company_name || req.user.shop_name || req.user.name;
        for (const sa of saRes.rows) {
          await pool.query(
            `INSERT INTO notifications (user_id, title, message, type, link)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              sa.id,
              `New ${roleLabel} Ad Posted`,
              `${roleLabel} "${senderName}" submitted ad "${title.trim()}" (Target: ${target_district || 'All'}/${target_city || 'All'}).`,
              'info',
              '/super-admin/approvals'
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
      { title: newAd.title, status: newAd.status, payment_status: newAd.payment_status },
      req.ip
    );

    return res.status(201).json({
      success: true,
      message: initialStatus === 'active'
        ? 'Advertisement posted and live across targeted cities & districts successfully!'
        : 'Ad created successfully! Please complete single ad slot payment to activate this campaign on the user portal.',
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

/**
 * @desc Pay for single ad slot (Advertiser / Vendor)
 * @route POST /api/v1/ads/:id/pay
 * @access Private (Advertiser / Vendor / Super Admin)
 */
exports.submitPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payment_reference, payment_amount = 999, auto_activate = false } = req.body;

    const findRes = await pool.query('SELECT * FROM advertisements WHERE id = $1', [id]);
    if (findRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Advertisement not found' });
    }

    const ad = findRes.rows[0];
    if (req.user.role !== 'super_admin' && ad.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify this ad' });
    }

    const isInstant = auto_activate === true || auto_activate === 'true' || req.user.role === 'super_admin';
    const newPayStatus = isInstant ? 'paid' : 'pending_verification';
    const newStatus = isInstant ? 'active' : 'pending';
    const ref = isInstant
      ? (payment_reference || `DEMO-AD-${Date.now().toString().slice(-6)}`)
      : (payment_reference ? payment_reference.trim() : `PAY-${Date.now().toString().slice(-6)}`);

    const updateRes = await pool.query(
      `UPDATE advertisements
       SET payment_status = $1,
           status = $2,
           payment_reference = $3,
           payment_amount = $4,
           payment_date = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [newPayStatus, newStatus, ref, parseFloat(payment_amount) || 999, id]
    );

    const updatedAd = updateRes.rows[0];

    // Notify Super Admin if pending review
    if (!isInstant) {
      const saRes = await pool.query("SELECT id FROM users WHERE role = 'super_admin'");
      for (const sa of saRes.rows) {
        await pool.query(
          `INSERT INTO notifications (user_id, title, message, type, link)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            sa.id,
            'Ad Slot Payment Submitted',
            `Ad "${ad.title}" has payment reference ${ref} awaiting verification.`,
            'info',
            '/super-admin/approvals'
          ]
        ).catch(() => {});
      }
    }

    return res.json({
      success: true,
      message: isInstant
        ? 'Ad payment completed! Your advertisement is now active on the portal.'
        : 'Ad payment submitted for verification! It will go live once verified.',
      data: updatedAd,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc Update advertisement details or replace media
 * @route PUT /api/v1/ads/:id
 * @access Private (Owner or Super Admin)
 */
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existingRes = await pool.query('SELECT * FROM advertisements WHERE id = $1', [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Advertisement not found' });
    }
    const ad = existingRes.rows[0];

    // Ownership check
    if (req.user.role !== 'super_admin' && ad.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this ad' });
    }

    const {
      title,
      tagline,
      description,
      target_panel,
      placement,
      action_type,
      cta_type,
      action_url,
      cta_phone,
      cta_link,
      action_text,
      media_type,
      ad_type,
      video_url,
      target_city,
      target_district,
      target_state,
    } = req.body;

    const bannerFile = req.files?.banner_image?.[0] || req.file;
    const videoFile = req.files?.video_file?.[0];

    let newBanner = bannerFile
      ? '/' + bannerFile.path.replace(/\\/g, '/').replace(/^.*\/uploads\//, 'uploads/')
      : (req.body.banner_image || ad.banner_image);

    let newVideo = videoFile
      ? '/' + videoFile.path.replace(/\\/g, '/').replace(/^.*\/uploads\//, 'uploads/')
      : (video_url !== undefined ? video_url : ad.video_url);

    const resolvedMediaType = media_type || ad_type || (videoFile || newVideo ? 'video' : ad.media_type);
    if (resolvedMediaType === 'video' && !newVideo) {
      newVideo = '/ads/sample-ad-video.mp4';
    }

    const resolvedPanel = target_panel || placement || ad.target_panel;
    const resolvedActionType = action_type || cta_type || ad.action_type;
    const resolvedActionUrl = action_url || cta_phone || cta_link || ad.action_url;

    const updateQuery = `
      UPDATE advertisements
      SET title = COALESCE($1, title),
          tagline = COALESCE($2, tagline),
          description = COALESCE($3, description),
          target_panel = COALESCE($4, target_panel),
          action_type = COALESCE($5, action_type),
          action_url = COALESCE($6, action_url),
          action_text = COALESCE($7, action_text),
          media_type = COALESCE($8, media_type),
          video_url = $9,
          banner_image = COALESCE($10, banner_image),
          target_city = COALESCE($11, target_city),
          target_district = COALESCE($12, target_district),
          target_state = COALESCE($13, target_state),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `;

    const updatedRes = await pool.query(updateQuery, [
      title ? title.trim() : null,
      tagline ? tagline.trim() : null,
      description ? description.trim() : null,
      resolvedPanel,
      resolvedActionType,
      resolvedActionUrl ? resolvedActionUrl.trim() : null,
      action_text ? action_text.trim() : null,
      resolvedMediaType,
      newVideo,
      newBanner,
      target_city ? target_city.trim() : null,
      target_district ? target_district.trim() : null,
      target_state ? target_state.trim() : null,
      id
    ]);

    return res.json({
      success: true,
      message: 'Advertisement updated successfully',
      data: updatedRes.rows[0]
    });
  } catch (err) {
    next(err);
  }
};
