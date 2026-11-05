const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agent.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

// Require authentication and agent or super_admin role for all agent operations
router.use(authenticate, authorize('agent', 'super_admin'));

/**
 * @route   GET /api/v1/agent/stats
 * @desc    Get agent summary metrics, earnings, and totals
 * @access  Private (Agent / Super Admin)
 */
router.get('/stats', agentController.getStats);

/**
 * @route   GET /api/v1/agent/businesses
 * @desc    Get vendor businesses onboarded / linked by agent
 * @access  Private (Agent / Super Admin)
 */
router.get('/businesses', agentController.getBusinesses);

/**
 * @route   POST /api/v1/agent/businesses
 * @desc    Onboard or link a new vendor business under agent
 * @access  Private (Agent / Super Admin)
 */
router.post('/businesses', agentController.linkBusiness);

/**
 * @route   GET /api/v1/agent/associations
 * @desc    Get associations registered / introduced by agent
 * @access  Private (Agent / Super Admin)
 */
router.get('/associations', agentController.getAssociations);

/**
 * @route   POST /api/v1/agent/associations
 * @desc    Register a new layout association introduced by agent
 * @access  Private (Agent / Super Admin)
 */
router.post('/associations', agentController.registerAssociation);

/**
 * @route   GET /api/v1/agent/ads
 * @desc    Get advertisements sold or managed by agent
 * @access  Private (Agent / Super Admin)
 */
router.get('/ads', agentController.getAds);

/**
 * @route   GET /api/v1/agent/renewals
 * @desc    Get upcoming renewals for associations, vendors, and ads with WhatsApp links
 * @access  Private (Agent / Super Admin)
 */
router.get('/renewals', agentController.getRenewals);

module.exports = router;
