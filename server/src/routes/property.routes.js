const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/property.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const upload = require('../config/multer');

// Multer upload middleware for property images (up to 8 photos)
const propertyImagesUpload = (req, res, next) => {
  if (upload && upload.propertyUpload) {
    upload.propertyUpload(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Property photos upload failed'
        });
      }
      next();
    });
  } else if (upload && upload.uploadGeneric) {
    upload.uploadGeneric('properties', 15 * 1024 * 1024).array('images', 8)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Property photos upload failed'
        });
      }
      next();
    });
  } else {
    next();
  }
};

/**
 * @route   GET /api/v1/properties/pending
 * @desc    Get all pending property listings awaiting Super Admin approval
 * @access  Private (Super Admin)
 */
router.get(
  '/pending',
  authenticate,
  authorize('super_admin'),
  propertyController.getPending
);

/**
 * @route   GET /api/v1/properties/my-listings
 * @desc    Get all property listings posted by the current user
 * @access  Private (Authenticated)
 */
router.get(
  '/my-listings',
  authenticate,
  propertyController.getMyListings
);

/**
 * @route   GET /api/v1/properties
 * @desc    Get all approved property listings across all associations
 * @access  Public / Authenticated
 */
router.get('/', optionalAuth, propertyController.getAll);

/**
 * @route   GET /api/v1/properties/:id
 * @desc    Get specific property listing details
 * @access  Public / Authenticated
 */
router.get('/:id', optionalAuth, propertyController.getById);

/**
 * @route   POST /api/v1/properties
 * @desc    Submit a new property listing (defaults to pending Super Admin approval)
 * @access  Private (Authenticated)
 */
router.post(
  '/',
  authenticate,
  propertyImagesUpload,
  propertyController.create
);

/**
 * @route   PUT /api/v1/properties/:id/approve
 * @desc    Approve a pending property listing (Super Admin only)
 * @access  Private (Super Admin)
 */
router.put(
  '/:id/approve',
  authenticate,
  authorize('super_admin'),
  propertyController.approve
);

/**
 * @route   PUT /api/v1/properties/:id/reject
 * @desc    Reject a pending property listing (Super Admin only)
 * @access  Private (Super Admin)
 */
router.put(
  '/:id/reject',
  authenticate,
  authorize('super_admin'),
  propertyController.reject
);

/**
 * @route   PATCH /api/v1/properties/:id/status
 * @desc    Mark property listing status (sold, rented, approved)
 * @access  Private (Owner or Super Admin)
 */
router.patch(
  '/:id/status',
  authenticate,
  propertyController.markStatus
);

/**
 * @route   DELETE /api/v1/properties/:id
 * @desc    Delete a property listing
 * @access  Private (Owner or Super Admin)
 */
router.delete(
  '/:id',
  authenticate,
  propertyController.delete
);

module.exports = router;
