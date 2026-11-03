const path = require('path');
const pool = require('../config/db');

// Normalize uploaded file path to web-accessible /uploads/... URL
const normalizeFilePath = (file, defaultDir = 'products') => {
  if (!file) return null;
  const raw = (file.path || file).replace(/\\/g, '/');
  const uploadIdx = raw.indexOf('/uploads/');
  if (uploadIdx !== -1) return raw.substring(uploadIdx);
  return `/uploads/${defaultDir}/${path.basename(raw)}`;
};

const productController = {
  /**
   * List all products (for Member Portal / Directory)
   * Public or Authenticated (Residents see their association + general products)
   */
  async getAll(req, res, next) {
    try {
      const {
        association_id,
        category,
        search,
        in_stock,
        vendor_id
      } = req.query;

      let queryText = `
        SELECT p.id, p.vendor_id, p.association_id, p.name, p.description,
               p.category, p.price, p.discount_price, p.unit, p.image,
               p.in_stock, p.is_active, p.created_at, p.updated_at,
               u.name as vendor_name,
               u.shop_name,
               u.shop_category,
               u.shop_address,
               COALESCE(u.shop_phone, u.phone) as shop_phone,
               u.shop_logo,
               u.business_hours,
               u.upi_id,
               u.email as vendor_email,
               a.name as association_name,
               a.code as association_code
        FROM products p
        INNER JOIN users u ON p.vendor_id = u.id
        LEFT JOIN associations a ON p.association_id = a.id
        WHERE u.status = 'approved' AND p.is_active = true
      `;
      const queryParams = [];

      // Filter by association if provided or default to member's association
      const targetAssocId = association_id || (req.user?.role === 'member' ? req.user.association_id : null);
      if (targetAssocId) {
        queryParams.push(targetAssocId);
        queryText += ` AND (p.association_id = $${queryParams.length} OR p.association_id IS NULL)`;
      }

      if (vendor_id) {
        queryParams.push(parseInt(vendor_id, 10));
        queryText += ` AND p.vendor_id = $${queryParams.length}`;
      }

      if (category && category !== 'All' && category !== 'all') {
        queryParams.push(category);
        queryText += ` AND LOWER(p.category) = LOWER($${queryParams.length})`;
      }

      if (in_stock !== undefined && in_stock !== '') {
        const stockBool = in_stock === 'true' || in_stock === true || in_stock === '1' || in_stock === 1;
        queryParams.push(stockBool);
        queryText += ` AND p.in_stock = $${queryParams.length}`;
      }

      if (search && search.trim()) {
        queryParams.push(`%${search.trim().toLowerCase()}%`);
        queryText += ` AND (
          LOWER(p.name) LIKE $${queryParams.length} OR
          LOWER(COALESCE(p.description, '')) LIKE $${queryParams.length} OR
          LOWER(COALESCE(p.category, '')) LIKE $${queryParams.length} OR
          LOWER(COALESCE(u.shop_name, '')) LIKE $${queryParams.length}
        )`;
      }

      queryText += ' ORDER BY p.in_stock DESC, p.created_at DESC';

      const result = await pool.query(queryText, queryParams);
      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get products belonging to the logged-in Vendor
   */
  async getMyProducts(req, res, next) {
    try {
      const vendorId = req.user.id;
      const result = await pool.query(
        `SELECT p.*, a.name as association_name, a.code as association_code
         FROM products p
         LEFT JOIN associations a ON p.association_id = a.id
         WHERE p.vendor_id = $1
         ORDER BY p.created_at DESC`,
        [vendorId]
      );

      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get single product by ID
   */
  async getById(req, res, next) {
    try {
      const productId = parseInt(req.params.id, 10);
      const result = await pool.query(
        `SELECT p.*,
                u.name as vendor_name, u.shop_name, u.shop_category, u.shop_address,
                COALESCE(u.shop_phone, u.phone) as shop_phone, u.shop_logo, u.business_hours, u.upi_id,
                a.name as association_name, a.code as association_code
         FROM products p
         INNER JOIN users u ON p.vendor_id = u.id
         LEFT JOIN associations a ON p.association_id = a.id
         WHERE p.id = $1`,
        [productId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Add a new product (Vendor only)
   */
  async create(req, res, next) {
    try {
      const vendorId = req.user.id;
      const {
        name,
        description,
        category,
        price,
        discount_price,
        unit = 'piece',
        in_stock = true,
        association_id
      } = req.body;

      if (!name || price === undefined || price === null || price === '') {
        return res.status(400).json({
          success: false,
          message: 'Product name and price are required'
        });
      }

      const numPrice = parseFloat(price);
      if (isNaN(numPrice) || numPrice < 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be a valid positive number'
        });
      }

      const numDiscount = discount_price !== undefined && discount_price !== '' && discount_price !== null
        ? parseFloat(discount_price)
        : null;

      // Handle product image
      let imageUrl = null;
      if (req.file) {
        imageUrl = normalizeFilePath(req.file, 'products');
      } else if (req.body.image) {
        imageUrl = req.body.image;
      }

      // Inherit vendor's association if not provided
      const targetAssocId = association_id ? parseInt(association_id, 10) : (req.user.association_id || null);
      const stockBool = in_stock === true || in_stock === 'true' || in_stock === 1 || in_stock === '1';

      const insertQuery = `
        INSERT INTO products (
          vendor_id, association_id, name, description, category,
          price, discount_price, unit, image, in_stock, is_active
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10, true
        )
        RETURNING *
      `;

      const result = await pool.query(insertQuery, [
        vendorId,
        targetAssocId,
        name.trim(),
        description ? description.trim() : null,
        category ? category.trim() : 'General',
        numPrice,
        numDiscount,
        unit ? unit.trim() : 'piece',
        imageUrl,
        stockBool
      ]);

      res.status(201).json({
        success: true,
        message: `Product "${result.rows[0].name}" added to your shop catalog!`,
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update product (Owner Vendor or Super Admin)
   */
  async update(req, res, next) {
    try {
      const productId = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const userRole = req.user.role;

      // Check product exists
      const checkRes = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
      if (checkRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const existingProduct = checkRes.rows[0];
      if (userRole !== 'super_admin' && existingProduct.vendor_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied. You can only update products from your own shop.'
        });
      }

      const {
        name,
        description,
        category,
        price,
        discount_price,
        unit,
        in_stock,
        is_active,
        association_id
      } = req.body;

      const numPrice = price !== undefined && price !== '' ? parseFloat(price) : existingProduct.price;
      const numDiscount = discount_price !== undefined
        ? (discount_price !== '' && discount_price !== null ? parseFloat(discount_price) : null)
        : existingProduct.discount_price;

      let imageUrl = existingProduct.image;
      if (req.file) {
        imageUrl = normalizeFilePath(req.file, 'products');
      } else if (req.body.image !== undefined) {
        imageUrl = req.body.image;
      }

      const stockBool = in_stock !== undefined
        ? (in_stock === true || in_stock === 'true' || in_stock === 1 || in_stock === '1')
        : existingProduct.in_stock;

      const activeBool = is_active !== undefined
        ? (is_active === true || is_active === 'true' || is_active === 1 || is_active === '1')
        : existingProduct.is_active;

      const updateQuery = `
        UPDATE products
        SET name = COALESCE($1, name),
            description = $2,
            category = COALESCE($3, category),
            price = $4,
            discount_price = $5,
            unit = COALESCE($6, unit),
            image = $7,
            in_stock = $8,
            is_active = $9,
            updated_at = NOW()
        WHERE id = $10
        RETURNING *
      `;

      const result = await pool.query(updateQuery, [
        name ? name.trim() : null,
        description !== undefined ? (description ? description.trim() : null) : existingProduct.description,
        category ? category.trim() : null,
        numPrice,
        numDiscount,
        unit ? unit.trim() : null,
        imageUrl,
        stockBool,
        activeBool,
        productId
      ]);

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Toggle in_stock status
   */
  async toggleStock(req, res, next) {
    try {
      const productId = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const userRole = req.user.role;

      const checkRes = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
      if (checkRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const product = checkRes.rows[0];
      if (userRole !== 'super_admin' && product.vendor_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied. You can only modify your own shop products.'
        });
      }

      const newStockStatus = !product.in_stock;
      const result = await pool.query(
        'UPDATE products SET in_stock = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [newStockStatus, productId]
      );

      res.json({
        success: true,
        message: `Product is now marked as ${newStockStatus ? 'In Stock' : 'Out of Stock'}`,
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete a product
   */
  async delete(req, res, next) {
    try {
      const productId = parseInt(req.params.id, 10);
      const userId = req.user.id;
      const userRole = req.user.role;

      const checkRes = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
      if (checkRes.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const product = checkRes.rows[0];
      if (userRole !== 'super_admin' && product.vendor_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied. You can only delete your own shop products.'
        });
      }

      await pool.query('DELETE FROM products WHERE id = $1', [productId]);

      res.json({
        success: true,
        message: `Product "${product.name}" deleted successfully`
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get distinct categories
   */
  async getCategories(req, res, next) {
    try {
      const result = await pool.query(
        `SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND is_active = true ORDER BY category ASC`
      );
      const categories = result.rows.map(r => r.category);
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = productController;
