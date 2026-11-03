const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const upload = require('../config/multer');

// Multer upload wrapper for product images
const productUploadMiddleware = (req, res, next) => {
  if (upload && upload.uploadGeneric) {
    upload.uploadGeneric('products', 5 * 1024 * 1024).single('image')(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Product image upload failed'
        });
      }
      next();
    });
  } else {
    next();
  }
};

/**
 * @route   GET /api/v1/products/categories
 * @desc    Get all distinct product categories
 * @access  Public / Authenticated
 */
router.get('/categories', productController.getCategories);

/**
 * @route   GET /api/v1/products/vendor/my-products
 * @desc    Get products belonging to current authenticated vendor
 * @access  Private (Vendor)
 */
router.get(
  '/vendor/my-products',
  authenticate,
  authorize('vendor'),
  productController.getMyProducts
);

/**
 * @route   GET /api/v1/products
 * @desc    Get list of products for resident portal
 * @access  Public / Authenticated
 */
router.get('/', optionalAuth, productController.getAll);

/**
 * @route   GET /api/v1/products/:id
 * @desc    Get single product details
 * @access  Public / Authenticated
 */
router.get('/:id', optionalAuth, productController.getById);

/**
 * @route   POST /api/v1/products
 * @desc    Create product for vendor shop
 * @access  Private (Vendor)
 */
router.post(
  '/',
  authenticate,
  authorize('vendor'),
  productUploadMiddleware,
  productController.create
);

/**
 * @route   PUT /api/v1/products/:id
 * @desc    Update product details
 * @access  Private (Vendor, Super Admin)
 */
router.put(
  '/:id',
  authenticate,
  authorize('vendor', 'super_admin'),
  productUploadMiddleware,
  productController.update
);

/**
 * @route   PATCH /api/v1/products/:id/toggle-stock
 * @desc    Toggle product in-stock status
 * @access  Private (Vendor, Super Admin)
 */
router.patch(
  '/:id/toggle-stock',
  authenticate,
  authorize('vendor', 'super_admin'),
  productController.toggleStock
);

/**
 * @route   DELETE /api/v1/products/:id
 * @desc    Delete product
 * @access  Private (Vendor, Super Admin)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('vendor', 'super_admin'),
  productController.delete
);

module.exports = router;
