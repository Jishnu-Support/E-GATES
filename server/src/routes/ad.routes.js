const express = require('express');
const router = express.Router();
const adController = require('../controllers/ad.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const upload = require('../config/multer');

// Multer upload wrapper for ad banner image
const adBannerUpload = (req, res, next) => {
  const handler =
    typeof upload?.adUpload === 'function'
      ? upload.adUpload
      : upload?.adUpload?.single
      ? upload.adUpload.single('banner_image')
      : upload?.uploadGeneric
      ? upload.uploadGeneric('ads', 15 * 1024 * 1024).single('banner_image')
      : null;

  if (handler) {
    handler(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Ad banner image upload failed',
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
 * @desc    Get ads created by the logged-in vendor or super admin
 * @access  Private (Vendor / Super Admin)
 */
router.get('/my-ads', authenticate, authorize('vendor', 'super_admin'), adController.getMyAds);

/**
 * @route   GET /api/v1/ads
 * @desc    Get all ads with status and performance (Super Admin)
 * @access  Private (Super Admin)
 */
router.get('/', authenticate, authorize('super_admin'), adController.getAll);

/**
 * @route   POST /api/v1/ads
 * @desc    Create advertisement or submit vendor campaign request
 * @access  Private (Super Admin / Vendor)
 */
router.post(
  '/',
  authenticate,
  authorize('super_admin', 'vendor'),
  adBannerUpload,
  adController.create
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
 * @access  Private (Super Admin / Vendor)
 */
router.patch('/:id/toggle-status', authenticate, authorize('super_admin', 'vendor'), adController.toggleStatus);

/**
 * @route   DELETE /api/v1/ads/:id
 * @desc    Delete ad
 * @access  Private (Super Admin / Vendor)
 */
router.delete('/:id', authenticate, authorize('super_admin', 'vendor'), adController.delete);

module.exports = router;
