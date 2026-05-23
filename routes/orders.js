const express = require('express');
const router = express.Router();
const db = require('../db');
const { calculateShipping } = require('../utils/shipping');

// POST /orders - Create order from checkout form
router.post('/orders', (req, res) => {
  const { customer_name, customer_phone, customer_email, customer_address, city, pincode, cartItems } = req.body;
  
  if (!customer_name || !customer_phone || !customer_address || !city || !pincode || !cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ error: 'Please fill in all required fields and ensure cart is not empty.' });
  }

  try {
    let subtotal = 0;
    let totalWeight = 0;
    const validatedItems = [];

    // Verify stock and calculate price/weight server-side for security
    for (const item of cartItems) {
      const product = db.getProductById(item.id);
      if (!product) {
        return res.status(400).json({ error: `Product with ID ${item.id} not found.` });
      }
      
      const quantity = parseInt(item.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ error: `Invalid quantity for ${product.name}.` });
      }

      const itemSize = item.size || 'M';
      let availableStock = 0;
      if (typeof product.stock === 'number') {
        availableStock = product.stock;
      } else if (product.stock && typeof product.stock === 'object') {
        availableStock = product.stock[itemSize] || 0;
      }

      if (availableStock < quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${product.name} (Size ${itemSize}). Available: ${availableStock}, Requested: ${quantity}` 
        });
      }

      const itemTotal = product.price * quantity;
      subtotal += itemTotal;
      totalWeight += (product.weight > 0 ? product.weight : 500) * quantity;
      
      validatedItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: quantity,
        size: item.size || 'M',
        price: product.price
      });
    }

    // Weight-based shipping calculation
    const shipping = calculateShipping(totalWeight);
    const total = subtotal + shipping;

    // Save order (initially status = 'pending')
    const order = db.createOrder({
      customer_name,
      customer_phone,
      customer_email,
      customer_address,
      city,
      pincode,
      subtotal,
      shipping,
      total,
      total_weight: totalWeight,
      items: validatedItems
    });

    res.json({ success: true, orderNumber: order.order_number });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while placing the order. Please try again.' });
  }
});

// GET /orders/:orderNumber/invoice - Render Invoice
router.get('/orders/:orderNumber/invoice', (req, res) => {
  const order = db.getOrderByNumber(req.params.orderNumber);
  if (!order) {
    return res.status(404).send('Invoice not found.');
  }
  res.render('invoice', { order });
});

// GET /orders/:orderNumber/receipt - Render Printable Receipt
router.get('/orders/:orderNumber/receipt', (req, res) => {
  const order = db.getOrderByNumber(req.params.orderNumber);
  if (!order) {
    return res.status(404).send('Receipt not found.');
  }
  
  // A receipt should only be visible for paid orders
  if (order.status !== 'paid' && order.payment_status !== 'completed') {
    return res.redirect(`/orders/${order.order_number}/invoice`);
  }
  
  res.render('receipt', { order });
});

module.exports = router;
