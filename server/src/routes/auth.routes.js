const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const upload = require('../config/multer');

// Rate limiter for authentication attempts (unlimited attempts accepted)
const authLimiter = (req, res, next) => next();

// Multer middleware wrapper for proof documents upload
const proofUploadMiddleware = (req, res, next) => {
  if (upload && upload.proofUpload && typeof upload.proofUpload.fields === 'function') {
    upload.proofUpload.fields([
      { name: 'eb_bill_proof', maxCount: 1 },
      { name: 'property_tax_receipt', maxCount: 1 },
      { name: 'profile_photo', maxCount: 1 }
    ])(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed'
        });
      }
      next();
    });
  } else {
    next();
  }
};

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user (member/admin)
 * @access  Public
 */
router.post(
  '/register',
  authLimiter,
  proofUploadMiddleware,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').trim().isLength({ min: 10, max: 15 }).withMessage('Valid phone number is required (10-15 digits)'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('role').optional().isIn(['member', 'admin']).withMessage('Invalid role'),
    validate
  ],
  authController.register
);

// Multer middleware wrapper for association + admin registration (logo + proofs + profile photo)
const assocAdminUploadMiddleware = (req, res, next) => {
  if (upload && upload.uploadGeneric) {
    upload.uploadGeneric('documents', 5 * 1024 * 1024).fields([
      { name: 'logo', maxCount: 1 },
      { name: 'eb_bill_proof', maxCount: 1 },
      { name: 'property_tax_receipt', maxCount: 1 },
      { name: 'profile_photo', maxCount: 1 }
    ])(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed'
        });
      }
      next();
    });
  } else {
    next();
  }
};

/**
 * @route   POST /api/v1/auth/register-association-admin
 * @desc    Public combined registration: create new association and its administrator
 * @access  Public
 */
router.post(
  '/register-association-admin',
  authLimiter,
  assocAdminUploadMiddleware,
  [
    body('association_name').trim().notEmpty().withMessage('Association name is required'),
    body('association_city').trim().notEmpty().withMessage('Association city is required'),
    body('name').trim().notEmpty().withMessage('Administrator name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').trim().isLength({ min: 10, max: 15 }).withMessage('Valid phone number is required (10-15 digits)'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    validate
  ],
  authController.registerAssociationAndAdmin
);

// Multer middleware wrapper for vendor shop registration (shop logo)
const vendorUploadMiddleware = (req, res, next) => {
  if (upload && upload.uploadGeneric) {
    upload.uploadGeneric('logos', 5 * 1024 * 1024).fields([
      { name: 'shop_logo', maxCount: 1 }
    ])(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Shop logo upload failed'
        });
      }
      next();
    });
  } else {
    next();
  }
};

/**
 * @route   POST /api/v1/auth/register-vendor
 * @desc    Public registration for local vendor / merchant shop
 * @access  Public
 */
router.post(
  '/register-vendor',
  authLimiter,
  vendorUploadMiddleware,
  [
    body('name').trim().notEmpty().withMessage('Merchant name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').trim().isLength({ min: 10, max: 15 }).withMessage('Valid phone number is required (10-15 digits)'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('shop_name').trim().notEmpty().withMessage('Shop / Business name is required'),
    body('shop_category').trim().notEmpty().withMessage('Shop category is required'),
    validate
  ],
  authController.registerVendor
);

// Multer middleware wrapper for Agent registration (profile photo)
const agentUploadMiddleware = (req, res, next) => {
  if (upload && upload.uploadGeneric) {
    upload.uploadGeneric('profiles', 5 * 1024 * 1024).fields([
      { name: 'profile_photo', maxCount: 1 }
    ])(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message || 'Profile photo upload failed' });
      next();
    });
  } else {
    next();
  }
};

/**
 * @route   POST /api/v1/auth/register-agent
 * @desc    Public registration for Growth & Business Agent
 * @access  Public
 */
router.post(
  '/register-agent',
  authLimiter,
  agentUploadMiddleware,
  [
    body('name').trim().notEmpty().withMessage('Agent name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').trim().isLength({ min: 10, max: 15 }).withMessage('Valid phone number is required (10-15 digits)'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    validate
  ],
  authController.registerAgent
);

// Multer middleware wrapper for Advertiser / Ad Company registration (company logo)
const advertiserUploadMiddleware = (req, res, next) => {
  if (upload && upload.uploadGeneric) {
    upload.uploadGeneric('logos', 5 * 1024 * 1024).fields([
      { name: 'company_logo', maxCount: 1 }
    ])(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message || 'Company logo upload failed' });
      next();
    });
  } else {
    next();
  }
};

/**
 * @route   POST /api/v1/auth/register-advertiser
 * @desc    Public registration for Advertiser / Ad Company
 * @access  Public
 */
router.post(
  '/register-advertiser',
  authLimiter,
  advertiserUploadMiddleware,
  [
    body('name').trim().notEmpty().withMessage('Contact person name is required'),
    body('company_name').trim().notEmpty().withMessage('Company / Brand name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('phone').trim().isLength({ min: 10, max: 15 }).withMessage('Valid phone number is required (10-15 digits)'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    validate
  ],
  authController.registerAdvertiser
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user with email/phone & password
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  [
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  authController.login
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh-token', authController.refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user and clear tokens
 * @access  Public
 */
router.post('/logout', authController.logout);

/**
 * @route   POST /api/v1/auth/forgot-password
 * @desc    Self-service password reset lookup & OTP generation
 * @access  Public
 */
router.post(
  '/forgot-password',
  authLimiter,
  authController.forgotPassword
);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token or self-service session
 * @access  Public
 */
router.post(
  '/reset-password',
  authLimiter,
  [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    validate
  ],
  authController.resetPassword
);

module.exports = router;
