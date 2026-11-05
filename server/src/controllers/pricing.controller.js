const pool = require('../config/db');
const { logAudit } = require('../utils/auditLogger');

const pricingController = {
  /**
   * Get all active pricing plans (Vendor, Association, Ad Image, Ad Video)
   * @route GET /api/v1/pricing
   */
  async getPlans(req, res, next) {
    try {
      const { type } = req.query;
      let query = 'SELECT * FROM pricing_plans';
      const params = [];

      if (type) {
        query += ' WHERE plan_type = $1';
        params.push(type);
      }

      query += ' ORDER BY plan_type, duration_days ASC';
      const result = await pool.query(query, params);

      // Parse features JSON safely
      const parsedPlans = result.rows.map((row) => {
        let features = [];
        if (row.features) {
          try {
            features = typeof row.features === 'string' ? JSON.parse(row.features) : row.features;
          } catch {
            features = [row.features];
          }
        }
        return {
          ...row,
          price: parseFloat(row.price),
          original_price: row.original_price ? parseFloat(row.original_price) : null,
          features,
        };
      });

      res.status(200).json({
        success: true,
        data: parsedPlans,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update plan pricing & features (Super Admin only)
   * @route PUT /api/v1/pricing/:id
   */
  async updatePlan(req, res, next) {
    try {
      const planId = parseInt(req.params.id, 10);
      const { name, price, original_price, duration_days, billing_cycle, features, is_active, is_popular } = req.body;

      const check = await pool.query('SELECT * FROM pricing_plans WHERE id = $1', [planId]);
      if (check.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Plan not found' });
      }

      const featuresJson = typeof features === 'object' ? JSON.stringify(features) : features;

      const updateRes = await pool.query(
        `UPDATE pricing_plans
         SET name = COALESCE($1, name),
             price = COALESCE($2, price),
             original_price = $3,
             duration_days = COALESCE($4, duration_days),
             billing_cycle = COALESCE($5, billing_cycle),
             features = COALESCE($6, features),
             is_active = COALESCE($7, is_active),
             is_popular = COALESCE($8, is_popular),
             updated_at = NOW()
         WHERE id = $9
         RETURNING *`,
        [
          name,
          price !== undefined ? parseFloat(price) : null,
          original_price !== undefined ? parseFloat(original_price) : null,
          duration_days !== undefined ? parseInt(duration_days, 10) : null,
          billing_cycle,
          featuresJson,
          is_active,
          is_popular,
          planId,
        ]
      );

      await logAudit(
        req.user.id,
        'PRICING_PLAN_UPDATE',
        'pricing_plans',
        planId,
        { name, price, duration_days },
        req.ip
      );

      res.status(200).json({
        success: true,
        message: 'Plan updated successfully',
        data: updateRes.rows[0],
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create a new pricing plan (Super Admin only)
   * @route POST /api/v1/pricing
   */
  async createPlan(req, res, next) {
    try {
      const { plan_type, billing_cycle, duration_days, name, price, original_price, features, is_popular } = req.body;

      if (!plan_type || !billing_cycle || !duration_days || !name || price === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Plan type, billing cycle, duration, name, and price are required',
        });
      }

      const featuresJson = typeof features === 'object' ? JSON.stringify(features) : (features || '[]');

      const result = await pool.query(
        `INSERT INTO pricing_plans (plan_type, billing_cycle, duration_days, name, price, original_price, features, is_popular, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
         RETURNING *`,
        [
          plan_type,
          billing_cycle,
          parseInt(duration_days, 10),
          name.trim(),
          parseFloat(price),
          original_price ? parseFloat(original_price) : null,
          featuresJson,
          Boolean(is_popular),
        ]
      );

      await logAudit(
        req.user.id,
        'PRICING_PLAN_CREATE',
        'pricing_plans',
        result.rows[0].id,
        { name, price },
        req.ip
      );

      res.status(201).json({
        success: true,
        message: 'New pricing plan created successfully',
        data: result.rows[0],
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete a pricing plan (Super Admin only)
   * @route DELETE /api/v1/pricing/:id
   */
  async deletePlan(req, res, next) {
    try {
      const planId = parseInt(req.params.id, 10);
      await pool.query('DELETE FROM pricing_plans WHERE id = $1', [planId]);

      await logAudit(
        req.user.id,
        'PRICING_PLAN_DELETE',
        'pricing_plans',
        planId,
        {},
        req.ip
      );

      res.status(200).json({
        success: true,
        message: 'Pricing plan removed successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = pricingController;
