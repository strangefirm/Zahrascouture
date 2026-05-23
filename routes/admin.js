const express = require('express');
const router = express.Router();
const db = require('../db');
const { isAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true' || !!process.env.VERCEL;
const uploadDir = isVercel ? path.join('/tmp', 'uploads') : path.join(__dirname, '../public/images/uploads');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.warn("Could not create upload directory:", e.message);
}

// Multer storage configuration for product images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpg, jpeg, png, webp) are allowed'));
  }
});

// Admin Login GET
router.get('/login', (req, res) => {
  if (req.session.isAdmin) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login', { error: null });
});

// Admin Login POST
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = db.getAdminByUsername(username);
    if (admin && bcrypt.compareSync(password, admin.password)) {
      req.session.isAdmin = true;
      req.session.username = username;
      return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', { error: 'Invalid username or password' });
  } catch (err) {
    console.error(err);
    res.render('admin/login', { error: 'An error occurred during authentication' });
  }
});

// Admin Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Admin Dashboard (Protected)
router.get('/dashboard', isAdmin, (req, res) => {
  const stats = db.getStats();
  // Get recent 5 orders
  const allOrders = db.getOrders();
  const recentOrders = [...allOrders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);
  
  res.render('admin/dashboard', { stats, recentOrders });
});

// Product spreadsheet view (Protected)
router.get('/products', isAdmin, (req, res) => {
  const products = db.getProducts();
  res.render('admin/products', { products });
});

// Add Product page GET
router.get('/products/new', isAdmin, (req, res) => {
  res.render('admin/product-form', { product: null, title: 'Add New Product' });
});

// Add Product POST
router.post('/products', isAdmin, upload.single('image'), (req, res) => {
  const { name, category, description, price, weight, size, color, fabric } = req.body;
  const image = req.file ? req.file.filename : 'hero_banner.png'; // default fallback image
  
  const sizesList = (size || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  const stockObj = {};
  sizesList.forEach(sz => {
    stockObj[sz] = parseInt(req.body[`stock_${sz}`]) || 0;
  });
  
  try {
    db.createProduct({
      name,
      category,
      description,
      price: parseFloat(price),
      stock: stockObj,
      weight: parseFloat(weight || 500),
      size,
      color,
      fabric,
      image
    });
    
    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error saving product');
  }
});

// Edit Product page GET
router.get('/products/:id/edit', isAdmin, (req, res) => {
  const product = db.getProductById(req.params.id);
  if (!product) return res.status(404).send('Product not found');
  res.render('admin/product-form', { product, title: 'Edit Product' });
});

// Edit Product POST
router.post('/products/:id', isAdmin, upload.single('image'), (req, res) => {
  const { name, category, description, price, weight, size, color, fabric, is_active } = req.body;
  const id = req.params.id;
  
  const sizesList = (size || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  const stockObj = {};
  sizesList.forEach(sz => {
    stockObj[sz] = parseInt(req.body[`stock_${sz}`]) || 0;
  });
  
  try {
    const product = db.getProductById(id);
    if (!product) return res.status(404).send('Product not found');
    
    let imageName = product.image;
    if (req.file) {
      imageName = req.file.filename;
      // Option: delete old image if it's not a seeded default
      if (product.image && !['hero_banner.png', 'collection_anarkali.png', 'collection_palazzo.png', 'about_fabric.png'].includes(product.image)) {
        const oldPath = path.join(uploadDir, product.image);
        try {
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch (err) {
          console.warn("Could not delete old image file:", err.message);
        }
      }
    }

    db.updateProduct(id, {
      name,
      category,
      description,
      price: parseFloat(price),
      stock: stockObj,
      weight: parseFloat(weight),
      size,
      color,
      fabric,
      image: imageName,
      is_active: is_active === 'on' || is_active == 1
    });

    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error updating product');
  }
});

// Delete Product
router.post('/products/:id/delete', isAdmin, (req, res) => {
  const id = req.params.id;
  try {
    const product = db.getProductById(id);
    if (product) {
      if (product.image && !['hero_banner.png', 'collection_anarkali.png', 'collection_palazzo.png', 'about_fabric.png'].includes(product.image)) {
        const oldPath = path.join(uploadDir, product.image);
        try {
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch (err) {
          console.warn("Could not delete deleted image file:", err.message);
        }
      }
      db.deleteProduct(id);
    }
    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error deleting product');
  }
});

// Inline Stock/Price quick edit API
router.post('/products/:id/quick-edit', isAdmin, (req, res) => {
  const { stock, price } = req.body;
  try {
    const success = db.quickEditProduct(req.params.id, stock, price);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Product not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Orders list
router.get('/orders', isAdmin, (req, res) => {
  const orders = db.getOrders();
  res.render('admin/orders', { orders });
});

// Update order status POST
router.post('/orders/:orderNumber/status', isAdmin, (req, res) => {
  const { status } = req.body;
  try {
    const success = db.updateOrderStatus(req.params.orderNumber, status);
    if (success) {
      res.redirect('/admin/orders');
    } else {
      res.status(404).send('Order not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error updating order status');
  }
});

module.exports = router;
