const express = require('express');
const router = express.Router();
const db = require('../db');
const { calculateShipping } = require('../utils/shipping');

// Public Catalog/Home (Landing Page)
router.get('/', (req, res) => {
  // Get active products for display
  const products = db.getActiveProducts();
  
  // Categorize for landing page preview
  const salwarProducts = products.filter(p => p.category === 'salwar').slice(0, 3);
  const anarkaliProducts = products.filter(p => p.category === 'anarkali').slice(0, 3);
  const palazzoProducts = products.filter(p => p.category === 'palazzo').slice(0, 3);
  
  res.render('index', { salwarProducts, anarkaliProducts, palazzoProducts });
});

// Full Shop Page (Catalog Browsing)
router.get('/shop', (req, res) => {
  const category = req.query.category || 'all';
  const sort = req.query.sort || 'latest';
  
  let products = db.getActiveProducts();
  
  // Filter by category
  if (category !== 'all') {
    products = products.filter(p => p.category === category);
  }
  
  // Sort
  if (sort === 'price-low') {
    products.sort((a, b) => a.price - b.price);
  } else if (sort === 'price-high') {
    products.sort((a, b) => b.price - a.price);
  } else {
    // default 'latest'
    products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  
  res.render('shop', { products, currentCategory: category, currentSort: sort });
});

// Cart Page
router.get('/cart', (req, res) => {
  res.render('cart');
});

// Checkout Page GET
router.get('/checkout', (req, res) => {
  res.render('checkout');
});

// AJAX endpoint to calculate shipping based on cart items
router.post('/api/shipping-calc', (req, res) => {
  const { items } = req.body; // array of { id, quantity }
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.json({ shippingCost: 0, totalWeight: 0 });
  }
  
  try {
    let totalWeight = 0;
    
    for (const item of items) {
      const product = db.getProductById(item.id);
      if (product) {
        // default 500g if weight is not specified or 0
        const weight = product.weight > 0 ? product.weight : 500;
        totalWeight += weight * parseInt(item.quantity);
      }
    }
    
    const shippingCost = calculateShipping(totalWeight);
    
    res.json({ 
      shippingCost: parseFloat(shippingCost.toFixed(2)), 
      totalWeight: totalWeight 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AJAX endpoint to get active products (for frontend search/filter)
router.get('/api/products', (req, res) => {
  res.json(db.getActiveProducts());
});

module.exports = router;
