require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup directories
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true' || !!process.env.VERCEL;
const uploadsDir = path.join(__dirname, 'public/images/uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  console.warn("Could not create uploads directory (might be read-only):", e.message);
}

// Serve existing images if needed
const imagesDir = path.join(__dirname, 'public/images');
try {
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
} catch (e) {
  console.warn("Could not create images directory:", e.message);
}

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploads from /tmp/uploads dynamically on Vercel
if (isVercel) {
  const tmpUploads = path.join('/tmp', 'uploads');
  try {
    if (!fs.existsSync(tmpUploads)) {
      fs.mkdirSync(tmpUploads, { recursive: true });
    }
  } catch (e) {
    console.warn("Failed to create /tmp/uploads folder:", e.message);
  }
  app.use('/images/uploads', express.static(tmpUploads));
}

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'zahras_couture_default_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    secure: false // set to true in production with HTTPS
  }
}));

// Global views variables (e.g. cart count helper, etc.)
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Import Routes
const shopRoutes = require('./routes/shop');
const adminRoutes = require('./routes/admin');
const ordersRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payment');

// Mount Routes
app.use('/', shopRoutes);
app.use('/admin', adminRoutes);
app.use('/', ordersRoutes);
app.use('/', paymentRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Zahra's Couture e-commerce running on port ${PORT}`);
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(` Admin Portal: http://localhost:${PORT}/admin/login`);
  console.log(`==================================================`);
});

module.exports = app;
