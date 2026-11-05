const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { generateAssociationCode } = require('../utils/codeGenerator');
const { logAudit } = require('../utils/auditLogger');

const agentController = {
  /**
   * Get Agent summary stats
   * @route GET /api/v1/agent/stats
   */
  async getStats(req, res, next) {
    try {
      const agentId = req.user.id;

      // 1. Linked businesses count & breakdown
      const businessRes = await pool.query(
        `SELECT 
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE status = 'approved') as approved,
           COUNT(*) FILTER (WHERE status = 'pending') as pending,
           COUNT(*) FILTER (WHERE vendor_payment_status = 'paid') as paid_vendors
         FROM users 
         WHERE role = 'vendor' AND agent_id = $1`,
        [agentId]
      );

      // 2. Associations registered by agent
      const assocRes = await pool.query(
        `SELECT 
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE is_active = true) as active
         FROM associations 
         WHERE agent_id = $1`,
        [agentId]
      );

      // 3. Ads sold by agent
      const adsRes = await pool.query(
        `SELECT 
           COUNT(*) as total_ads,
           COUNT(*) FILTER (WHERE status = 'active') as active_ads,
           COALESCE(SUM(payment_amount), 0) as total_ad_volume,
           COALESCE(SUM(payment_amount) FILTER (WHERE payment_status = 'paid'), 0) as paid_ad_volume
         FROM advertisements 
         WHERE agent_id = $1 OR vendor_id = $1`,
        [agentId]
      );

      // 4. Agent profile info & referral code
      const agentRes = await pool.query(
        `SELECT agent_code, name, email, phone FROM users WHERE id = $1`,
        [agentId]
      );

      const agentData = agentRes.rows[0] || {};
      const businessStats = businessRes.rows[0] || {};
      const assocStats = assocRes.rows[0] || {};
      const adStats = adsRes.rows[0] || {};

      // Commission model estimate: 15% of paid ads + 100 per onboarded paid vendor
      const estEarnings = Math.round(
        Number(adStats.paid_ad_volume || 0) * 0.15 + Number(businessStats.paid_vendors || 0) * 100
      );

      res.status(200).json({
        success: true,
        data: {
          agent_code: agentData.agent_code,
          name: agentData.name,
          email: agentData.email,
          phone: agentData.phone,
          businesses: {
            total: parseInt(businessStats.total || 0, 10),
            approved: parseInt(businessStats.approved || 0, 10),
            pending: parseInt(businessStats.pending || 0, 10),
            paid: parseInt(businessStats.paid_vendors || 0, 10),
          },
          associations: {
            total: parseInt(assocStats.total || 0, 10),
            active: parseInt(assocStats.active || 0, 10),
          },
          ads: {
            total: parseInt(adStats.total_ads || 0, 10),
            active: parseInt(adStats.active_ads || 0, 10),
            ad_volume: parseFloat(adStats.total_ad_volume || 0),
            paid_volume: parseFloat(adStats.paid_volume || 0),
          },
          estimated_commission: estEarnings,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get businesses linked to this agent
   * @route GET /api/v1/agent/businesses
   */
  async getBusinesses(req, res, next) {
    try {
      const agentId = req.user.id;
      const result = await pool.query(
        `SELECT id, name, email, phone, business_name, business_category, taluk, district, state,
                status, vendor_payment_status, created_at, profile_photo
         FROM users 
         WHERE role = 'vendor' AND agent_id = $1
         ORDER BY created_at DESC`,
        [agentId]
      );

      res.status(200).json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Onboard/Link a new business (Vendor shop)
   * @route POST /api/v1/agent/businesses
   */
  async linkBusiness(req, res, next) {
    try {
      const agentId = req.user.id;
      const { name, email, phone, business_name, business_category, district, taluk, state, address, password } = req.body;

      if (!name || !business_name || !phone) {
        return res.status(400).json({
          success: false,
          message: 'Contact person name, business name, and phone number are required',
        });
      }

      // Check if user already exists
      const normalizedEmail = email ? email.toLowerCase().trim() : `${phone.trim()}@vendor.local`;
      const existingUser = await pool.query(
        'SELECT id, role, agent_id FROM users WHERE email = $1 OR phone = $2',
        [normalizedEmail, phone.trim()]
      );

      if (existingUser.rows.length > 0) {
        const u = existingUser.rows[0];
        if (u.agent_id) {
          return res.status(400).json({
            success: false,
            message: 'This vendor is already linked to an agent code.',
          });
        }
        // Link existing vendor to this agent
        await pool.query('UPDATE users SET agent_id = $1 WHERE id = $2', [agentId, u.id]);
        return res.status(200).json({
          success: true,
          message: 'Existing vendor successfully linked to your agent account!',
          data: { id: u.id },
        });
      }

      // Create new vendor under this agent
      const defaultPassword = password || 'Vendor@123';
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(defaultPassword, salt);

      const newUser = await pool.query(
        `INSERT INTO users (
           name, email, phone, password_hash, role, status, 
           business_name, business_category, district, taluk, state, address,
           agent_id, vendor_payment_status
         ) VALUES ($1, $2, $3, $4, 'vendor', 'pending', $5, $6, $7, $8, $9, $10, $11, 'unpaid')
         RETURNING id, name, email, phone, business_name, business_category, status, vendor_payment_status, created_at`,
        [
          name.trim(),
          normalizedEmail,
          phone.trim(),
          password_hash,
          business_name.trim(),
          business_category || 'Retail & Local Shop',
          district || 'Krishnagiri',
          taluk || 'Hosur',
          state || 'Tamil Nadu',
          address || '',
          agentId,
        ]
      );

      await logAudit(
        agentId,
        'AGENT_VENDOR_ONBOARD',
        'users',
        newUser.rows[0].id,
        { business_name, phone },
        req.ip
      );

      res.status(201).json({
        success: true,
        message: 'Vendor registered successfully under your Agent ID and sent for Super Admin approval!',
        data: newUser.rows[0],
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get associations registered by this agent
   * @route GET /api/v1/agent/associations
   */
  async getAssociations(req, res, next) {
    try {
      const agentId = req.user.id;
      const result = await pool.query(
        `SELECT a.id, a.name, a.code, a.city, a.address, a.is_active, a.created_at,
                COUNT(u.id) FILTER (WHERE u.role = 'member') as member_count
         FROM associations a
         LEFT JOIN users u ON u.association_id = a.id
         WHERE a.agent_id = $1
         GROUP BY a.id
         ORDER BY a.created_at DESC`,
        [agentId]
      );

      res.status(200).json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Register a new layout association introduced by this agent
   * @route POST /api/v1/agent/associations
   */
  async registerAssociation(req, res, next) {
    try {
      const agentId = req.user.id;
      const { name, city, address, contact_person, contact_phone, contact_email } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Association name is required',
        });
      }

      const generatedCode = await generateAssociationCode(name.trim(), pool);

      const result = await pool.query(
        `INSERT INTO associations (name, code, city, address, agent_id, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         RETURNING *`,
        [
          name.trim(),
          generatedCode,
          city || 'Hosur',
          address || '',
          agentId,
        ]
      );

      const association = result.rows[0];

      // If contact person provided, optionally create pending admin record or notification
      if (contact_person && (contact_phone || contact_email)) {
        const adminEmail = contact_email ? contact_email.toLowerCase().trim() : `${contact_phone.trim()}@assoc.local`;
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash('Admin@123', salt);

        try {
          await pool.query(
            `INSERT INTO users (name, email, phone, password_hash, role, is_main_admin, association_id, status)
             VALUES ($1, $2, $3, $4, 'admin', true, $5, 'pending')
             ON CONFLICT (email) DO NOTHING`,
            [contact_person.trim(), adminEmail, contact_phone || null, password_hash, association.id]
          );
        } catch (e) {
          console.warn('Could not auto-create association admin user:', e.message);
        }
      }

      await logAudit(
        agentId,
        'AGENT_ASSOCIATION_REGISTER',
        'associations',
        association.id,
        { name: association.name, code: association.code },
        req.ip
      );

      res.status(201).json({
        success: true,
        message: 'Association registered successfully and linked to your Agent profile!',
        data: association,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get ads sold / brokered by this agent
   * @route GET /api/v1/agent/ads
   */
  async getAds(req, res, next) {
    try {
      const agentId = req.user.id;
      const result = await pool.query(
        `SELECT a.*, 
                u.name as advertiser_name, u.company_name, u.phone as advertiser_phone, u.email as advertiser_email
         FROM advertisements a
         LEFT JOIN users u ON a.vendor_id = u.id
         WHERE a.agent_id = $1 OR a.vendor_id = $1
         ORDER BY a.created_at DESC`,
        [agentId]
      );

      res.status(200).json({
        success: true,
        data: result.rows,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get renewals tracking for associations, vendors, and ads
   * @route GET /api/v1/agent/renewals
   */
  async getRenewals(req, res, next) {
    try {
      const agentId = req.user.id;

      // 1. Vendors needing renewal / payment
      const vendorsRes = await pool.query(
        `SELECT id, name, business_name, phone, email, status, vendor_payment_status, created_at
         FROM users 
         WHERE role = 'vendor' AND agent_id = $1
         ORDER BY created_at DESC`,
        [agentId]
      );

      // 2. Associations under this agent
      const associationsRes = await pool.query(
        `SELECT id, name, code, city, created_at, is_active
         FROM associations 
         WHERE agent_id = $1
         ORDER BY created_at DESC`,
        [agentId]
      );

      // 3. Ads under this agent nearing expiry or needing renewal
      const adsRes = await pool.query(
        `SELECT a.id, a.title, a.status, a.payment_status, a.payment_amount, a.end_date, a.created_at,
                u.name as advertiser_name, u.company_name, u.phone as advertiser_phone
         FROM advertisements a
         LEFT JOIN users u ON a.vendor_id = u.id
         WHERE a.agent_id = $1 OR a.vendor_id = $1
         ORDER BY a.end_date ASC NULLS LAST, a.created_at DESC`,
        [agentId]
      );

      // Format with pre-built WhatsApp messages
      const vendorRenewals = vendorsRes.rows.map((v) => {
        const cleanPhone = (v.phone || '').replace(/[^0-9]/g, '');
        const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const msg = encodeURIComponent(
          `Hello ${v.name} (${v.business_name || 'Business'}), this is your EGATES Community Growth Agent. We are checking in regarding your business vendor profile activation and renewal. Please let us know if you need any assistance!`
        );
        return {
          ...v,
          type: 'Vendor Subscription',
          whatsapp_url: cleanPhone ? `https://wa.me/${phoneWithCountry}?text=${msg}` : null,
        };
      });

      const assocRenewals = associationsRes.rows.map((a) => {
        return {
          ...a,
          type: 'Association Community License',
          renewal_period: 'Annual',
        };
      });

      const adRenewals = adsRes.rows.map((ad) => {
        const cleanPhone = (ad.advertiser_phone || '').replace(/[^0-9]/g, '');
        const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const msg = encodeURIComponent(
          `Hello ${ad.advertiser_name || ad.company_name || 'Advertiser'}, your advertisement "${ad.title}" on EGATES is up for renewal/slot booking. Contact me to extend your display slot across layouts!`
        );
        return {
          ...ad,
          type: 'Ad Campaign Slot',
          whatsapp_url: cleanPhone ? `https://wa.me/${phoneWithCountry}?text=${msg}` : null,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          vendors: vendorRenewals,
          associations: assocRenewals,
          ads: adRenewals,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = agentController;
