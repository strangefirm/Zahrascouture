const express = require('express');
const router = express.Router();
const db = require('../db');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialise Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_DmlnO3X9uQZ83X',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'YOUR_RAZORPAY_KEY_SECRET'
});

// GET /payment/:orderNumber - Render payment page and create Razorpay order session
router.get('/payment/:orderNumber', async (req, res) => {
  const order = db.getOrderByNumber(req.params.orderNumber);
  if (!order) {
    return res.status(404).send('Order not found.');
  }

  if (order.status === 'paid') {
    return res.redirect(`/orders/${order.order_number}/receipt`);
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET || 'YOUR_RAZORPAY_KEY_SECRET';

  // If Razorpay is not configured (still has placeholder), automatically use sandbox mock mode
  if (keySecret === 'YOUR_RAZORPAY_KEY_SECRET') {
    return res.render('payment', {
      order,
      razorpayOrderId: null,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_DmlnO3X9uQZ83X',
      amountInPaise: Math.round(order.total * 100),
      isSimulated: true,
      error: null
    });
  }

  try {
    // Razorpay requires amount in paise (multiply INR by 100)
    const options = {
      amount: Math.round(order.total * 100),
      currency: "INR",
      receipt: order.order_number,
      payment_capture: 1 // Auto capture payment
    };

    // Create order in Razorpay
    const rpOrder = await razorpay.orders.create(options);
    
    // Update local order with Razorpay Order ID
    order.razorpay_order_id = rpOrder.id;
    // Save state back to JSON DB
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../db/store.json'), 'utf8'));
    const oIndex = data.orders.findIndex(o => o.order_number === order.order_number);
    if (oIndex !== -1) {
      data.orders[oIndex].razorpay_order_id = rpOrder.id;
      fs.writeFileSync(path.join(__dirname, '../db/store.json'), JSON.stringify(data, null, 2), 'utf8');
    }

    res.render('payment', {
      order,
      razorpayOrderId: rpOrder.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_DmlnO3X9uQZ83X',
      amountInPaise: rpOrder.amount,
      isSimulated: false,
      error: null
    });
  } catch (err) {
    console.error('Razorpay Order Creation Failed:', err);
    // Render payment page anyway with sandbox simulator mode fallback
    res.render('payment', {
      order,
      razorpayOrderId: null,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_DmlnO3X9uQZ83X',
      amountInPaise: Math.round(order.total * 100),
      isSimulated: true,
      error: 'Online payment gateway initialization failed (using Sandbox Mode fallback).'
    });
  }
});

// POST /payment/verify - Verify signature after success
router.post('/payment/verify', (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, order_number } = req.body;
  
  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !order_number) {
    return res.status(400).json({ error: 'Missing payment details for verification.' });
  }

  try {
    const key_secret = process.env.RAZORPAY_KEY_SECRET || 'YOUR_RAZORPAY_KEY_SECRET';
    
    // Create signature hash
    const generated_signature = crypto
      .createHmac('sha256', key_secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (generated_signature === razorpay_signature || key_secret === 'YOUR_RAZORPAY_KEY_SECRET') {
      // Payment Verified!
      // This helper updates order status to 'paid', payment status to 'completed', 
      // and adjusts inventory levels automatically.
      const updatedOrder = db.updateOrderPayment(order_number, razorpay_payment_id);
      
      if (updatedOrder) {
        res.json({ success: true, redirectUrl: `/orders/${order_number}/receipt` });
      } else {
        res.status(500).json({ error: 'Failed to update order in database.' });
      }
    } else {
      res.status(400).json({ error: 'Payment verification failed (signature mismatch).' });
    }
  } catch (err) {
    console.error('Verification Error:', err);
    res.status(500).json({ error: 'An error occurred while verifying the payment.' });
  }
});

// Fallback for fs module inside route
const fs = require('fs');
const path = require('path');

module.exports = router;
