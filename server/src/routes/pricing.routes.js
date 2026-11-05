const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricing.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

/**
 * @route   GET /api/v1/pricing
 * @desc    Get all active pricing plans
 * @access  Public / Authenticated
 */
router.get('/', optionalAuth, pricingController.getPlans);

/**
 * @route   PUT /api/v1/pricing/:id
 * @desc    Update a pricing plan (price, duration, features)
 * @access  Private (Super Admin)
 */
router.put('/:id', authenticate, authorize('super_admin'), pricingController.updatePlan);

/**
 * @route   POST /api/v1/pricing
 * @desc    Create a custom pricing plan
 * @access  Private (Super Admin)
 */
router.post('/', authenticate, authorize('super_admin'), pricingController.createPlan);

/**
 * @route   DELETE /api/v1/pricing/:id
 * @desc    Delete a pricing plan
 * @access  Private (Super Admin)
 */
router.delete('/:id', authenticate, authorize('super_admin'), pricingController.deletePlan);

module.exports = router;
