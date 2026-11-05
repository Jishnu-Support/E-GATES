const express = require('express');
const router = express.Router();
const adController = require('../controllers/ad.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const upload = require('../config/multer');

// Multer upload wrapper for ad media (banner image and/or video file)
const adMediaUpload = (req, res, next) => {
  const handler = upload?.uploadGeneric
    ? upload.uploadGeneric('ads', 100 * 1024 * 1024).fields([
        { name: 'banner_image', maxCount: 1 },
        { name: 'video_file', maxCount: 1 },
      ])
    : null;

  if (handler) {
    handler(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Ad media upload failed',
        });
      }
      next();
    });
  } else {
    next();
  }
};

/**
 * @route   GET /api/v1/ads/active
 * @desc    Get active ads for display (Member, Admin or Both)
 * @access  Public / Authenticated
 */
router.get('/active', optionalAuth, adController.getActive);

/**
 * @route   PATCH /api/v1/ads/:id/click
 * @desc    Increment click count on ad click
 * @access  Public / Authenticated
 */
router.patch('/:id/click', optionalAuth, adController.recordClick);

/**
 * @route   GET /api/v1/ads/pending
 * @desc    Get pending ad requests for Super Admin review
 * @access  Private (Super Admin)
 */
router.get('/pending', authenticate, authorize('super_admin'), adController.getPending);

/**
 * @route   GET /api/v1/ads/my-ads
 * @desc    Get ads created by the logged-in vendor, advertiser, agent or super admin
 * @access  Private (Vendor / Advertiser / Agent / Super Admin)
 */
router.get('/my-ads', authenticate, authorize('vendor', 'advertiser', 'agent', 'super_admin'), adController.getMyAds);

/**
 * @route   GET /api/v1/ads
 * @desc    Get all ads with status and performance (Super Admin)
 * @access  Private (Super Admin)
 */
router.get('/', authenticate, authorize('super_admin'), adController.getAll);

/**
 * @route   POST /api/v1/ads
 * @desc    Create advertisement or submit vendor/advertiser campaign request
 * @access  Private (Super Admin / Vendor / Advertiser / Agent)
 */
router.put(
  '/:id',
  authenticate,
  authorize('super_admin', 'vendor', 'advertiser', 'agent'),
  adMediaUpload,
  adController.update
);

router.post(
  '/',
  authenticate,
  authorize('super_admin', 'vendor', 'advertiser', 'agent'),
  adMediaUpload,
  adController.create
);

/**
 * @route   POST /api/v1/ads/:id/pay
 * @desc    Submit payment (UTR / demo pay) for single ad slot
 * @access  Private (Advertiser / Vendor / Agent / Super Admin)
 */
router.post(
  '/:id/pay',
  authenticate,
  authorize('advertiser', 'vendor', 'agent', 'super_admin'),
  upload?.uploadGeneric ? upload.uploadGeneric('ad_payments', 10 * 1024 * 1024).single('payment_proof') : (req, res, next) => next(),
  adController.submitPayment
);

/**
 * @route   PATCH /api/v1/ads/:id/approve
 * @desc    Super Admin approves vendor ad
 * @access  Private (Super Admin)
 */
router.patch('/:id/approve', authenticate, authorize('super_admin'), adController.approve);

/**
 * @route   PATCH /api/v1/ads/:id/reject
 * @desc    Super Admin rejects vendor ad
 * @access  Private (Super Admin)
 */
router.patch('/:id/reject', authenticate, authorize('super_admin'), adController.reject);

/**
 * @route   PATCH /api/v1/ads/:id/toggle-status
 * @desc    Toggle active / paused
 * @access  Private (Super Admin / Vendor / Advertiser / Agent)
 */
router.patch('/:id/toggle-status', authenticate, authorize('super_admin', 'vendor', 'advertiser', 'agent'), adController.toggleStatus);

/**
 * @route   DELETE /api/v1/ads/:id
 * @desc    Delete ad
 * @access  Private (Super Admin / Vendor / Advertiser / Agent)
 */
router.delete('/:id', authenticate, authorize('super_admin', 'vendor', 'advertiser', 'agent'), adController.delete);

module.exports = router;
