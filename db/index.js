const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true' || !!process.env.VERCEL;
const seedDbPath = path.join(__dirname, 'store.json');
const dbPath = isVercel ? path.join('/tmp', 'store.json') : seedDbPath;

// Helper to copy seed database to /tmp if on Vercel and it doesn't exist yet
function initializeVercelDb() {
  if (isVercel && !fs.existsSync(dbPath)) {
    try {
      if (fs.existsSync(seedDbPath)) {
        fs.copyFileSync(seedDbPath, dbPath);
      } else {
        fs.writeFileSync(dbPath, JSON.stringify(defaultState, null, 2), 'utf8');
      }
    } catch (err) {
      console.error('Failed to copy seed database to /tmp:', err);
    }
  }
}

// Default initial database state
const defaultState = {
  admins: [
    {
      id: 1,
      username: 'admin',
      password: bcrypt.hashSync('adminpassword123', 10)
    }
  ],
  products: [
    {
      id: 1,
      name: "Burgundy Elegance Salwar Kameez",
      category: "salwar",
      description: "Classic silhouette with modern detailing. Features premium georgette fabric with intricate gold zari embroidery and a chiffon dupatta.",
      price: 1899.00,
      stock: {
        "S": 0,
        "M": 5,
        "L": 5,
        "XL": 5
      },
      weight: 600, // weight in grams
      size: "M,L,XL",
      color: "Burgundy",
      fabric: "Georgette & Chiffon",
      image: "hero_banner.png",
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      name: "Emerald Green Anarkali Suit",
      category: "anarkali",
      description: "Flowing floor-length elegance for weddings and celebrations. Exquisite thread and sequin work on pure silk.",
      price: 2499.00,
      stock: {
        "S": 2,
        "M": 2,
        "L": 2,
        "XL": 2
      },
      weight: 800,
      size: "S,M,L,XL",
      color: "Emerald Green",
      fabric: "Silk",
      image: "collection_anarkali.png",
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      name: "Royal Blue Palazzo Set",
      category: "palazzo",
      description: "Contemporary comfort meets ethnic charm. A gorgeous palazzo suit set in royal blue with detailed silver embroidery.",
      price: 1599.00,
      stock: {
        "S": 0,
        "M": 3,
        "L": 3,
        "XL": 3,
        "XXL": 3
      },
      weight: 500,
      size: "M,L,XL,XXL",
      color: "Royal Blue",
      fabric: "Rayon Blend",
      image: "collection_palazzo.png",
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  orders: []
};

// Read database from file
function readDb() {
  try {
    if (isVercel) {
      initializeVercelDb();
    }
    if (!fs.existsSync(dbPath)) {
      writeDb(defaultState);
      return defaultState;
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading JSON db, resetting to default:', err);
    writeDb(defaultState);
    return defaultState;
  }
}

// Write database to file
function writeDb(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing JSON db:', err);
  }
}

const db = {
  // --- ADMIN AUTH ---
  getAdminByUsername: (username) => {
    const data = readDb();
    return data.admins.find(a => a.username === username) || null;
  },

  // --- PRODUCTS ---
  getProducts: () => {
    const data = readDb();
    return data.products;
  },

  getActiveProducts: () => {
    const data = readDb();
    return data.products.filter(p => p.is_active === 1);
  },

  getProductById: (id) => {
    const data = readDb();
    return data.products.find(p => p.id === parseInt(id)) || null;
  },

  createProduct: (prod) => {
    const data = readDb();
    const newId = data.products.length > 0 ? Math.max(...data.products.map(p => p.id)) + 1 : 1;
    const newProduct = {
      id: newId,
      name: prod.name,
      category: prod.category,
      description: prod.description || '',
      price: parseFloat(prod.price),
      stock: (prod.stock && typeof prod.stock === 'object') ? prod.stock : {},
      weight: parseFloat(prod.weight || 500),
      size: prod.size || '',
      color: prod.color || '',
      fabric: prod.fabric || '',
      image: prod.image || 'hero_banner.png',
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.products.push(newProduct);
    writeDb(data);
    return newProduct;
  },

  updateProduct: (id, prod) => {
    const data = readDb();
    const index = data.products.findIndex(p => p.id === parseInt(id));
    if (index === -1) return null;

    data.products[index] = {
      ...data.products[index],
      name: prod.name,
      category: prod.category,
      description: prod.description,
      price: parseFloat(prod.price),
      stock: (prod.stock && typeof prod.stock === 'object') ? prod.stock : data.products[index].stock,
      weight: parseFloat(prod.weight),
      size: prod.size,
      color: prod.color,
      fabric: prod.fabric,
      image: prod.image,
      is_active: prod.is_active ? 1 : 0,
      updated_at: new Date().toISOString()
    };
    writeDb(data);
    return data.products[index];
  },

  deleteProduct: (id) => {
    const data = readDb();
    const index = data.products.findIndex(p => p.id === parseInt(id));
    if (index === -1) return false;
    data.products.splice(index, 1);
    writeDb(data);
    return true;
  },

  quickEditProduct: (id, stock, price) => {
    const data = readDb();
    const index = data.products.findIndex(p => p.id === parseInt(id));
    if (index === -1) return false;
    
    if (stock !== undefined) {
      if (typeof stock === 'object') {
        data.products[index].stock = stock;
      } else {
        data.products[index].stock = parseInt(stock);
      }
    }
    if (price !== undefined) {
      data.products[index].price = parseFloat(price);
    }
    data.products[index].updated_at = new Date().toISOString();
    writeDb(data);
    return true;
  },

  // --- ORDERS ---
  getOrders: () => {
    const data = readDb();
    return data.orders;
  },

  getOrderById: (id) => {
    const data = readDb();
    return data.orders.find(o => o.id === parseInt(id)) || null;
  },

  getOrderByNumber: (orderNumber) => {
    const data = readDb();
    return data.orders.find(o => o.order_number === orderNumber) || null;
  },

  createOrder: (orderData) => {
    const data = readDb();
    const newId = data.orders.length > 0 ? Math.max(...data.orders.map(o => o.id)) + 1 : 1;
    
    // Generate invoice order number like ZC-20260522-0001
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const dailyCount = data.orders.filter(o => o.order_number.startsWith(`ZC-${today}`)).length + 1;
    const orderNumber = `ZC-${today}-${String(dailyCount).padStart(4, '0')}`;

    const newOrder = {
      id: newId,
      order_number: orderNumber,
      customer_name: orderData.customer_name,
      customer_phone: orderData.customer_phone,
      customer_email: orderData.customer_email || '',
      customer_address: orderData.customer_address,
      city: orderData.city,
      pincode: orderData.pincode,
      subtotal: parseFloat(orderData.subtotal),
      shipping: parseFloat(orderData.shipping),
      total: parseFloat(orderData.total),
      total_weight: parseFloat(orderData.total_weight || 0),
      status: 'pending', // pending, paid, shipped, delivered, cancelled
      payment_id: '',
      payment_status: 'pending',
      razorpay_order_id: orderData.razorpay_order_id || '',
      items: orderData.items.map(item => ({
        product_id: parseInt(item.product_id),
        product_name: item.product_name,
        quantity: parseInt(item.quantity),
        size: item.size || 'M',
        price: parseFloat(item.price)
      })),
      created_at: new Date().toISOString()
    };

    data.orders.push(newOrder);
    writeDb(data);
    return newOrder;
  },

  updateOrderPayment: (orderNumber, paymentId, status = 'paid') => {
    const data = readDb();
    const index = data.orders.findIndex(o => o.order_number === orderNumber);
    if (index === -1) return false;

    data.orders[index].payment_id = paymentId;
    data.orders[index].payment_status = 'completed';
    data.orders[index].status = status;
    
    // Adjust stock for each item in the order
    data.orders[index].items.forEach(item => {
      const pIndex = data.products.findIndex(p => p.id === item.product_id);
      if (pIndex !== -1) {
        const product = data.products[pIndex];
        const size = item.size || 'M';
        if (product.stock && typeof product.stock === 'object') {
          product.stock[size] = Math.max(0, (product.stock[size] || 0) - item.quantity);
        } else if (typeof product.stock === 'number') {
          product.stock = Math.max(0, product.stock - item.quantity);
        }
        product.updated_at = new Date().toISOString();
      }
    });

    writeDb(data);
    return data.orders[index];
  },

  updateOrderStatus: (orderNumber, status) => {
    const data = readDb();
    const index = data.orders.findIndex(o => o.order_number === orderNumber);
    if (index === -1) return false;

    const order = data.orders[index];
    const oldPaymentStatus = order.payment_status;

    order.status = status;

    // Check if the new status represents a paid/completed payment state
    const isPaidState = ['paid', 'shipped', 'delivered'].includes(status);

    if (isPaidState && oldPaymentStatus !== 'completed') {
      // Transition from unpaid to paid: deduct stock
      order.payment_status = 'completed';
      order.items.forEach(item => {
        const pIndex = data.products.findIndex(p => p.id === item.product_id);
        if (pIndex !== -1) {
          const product = data.products[pIndex];
          const size = item.size || 'M';
          if (product.stock && typeof product.stock === 'object') {
            product.stock[size] = Math.max(0, (product.stock[size] || 0) - item.quantity);
          } else if (typeof product.stock === 'number') {
            product.stock = Math.max(0, product.stock - item.quantity);
          }
          product.updated_at = new Date().toISOString();
        }
      });
    } else if (!isPaidState && oldPaymentStatus === 'completed') {
      // Transition from paid back to unpaid (pending/cancelled): restore stock
      order.payment_status = 'pending';
      order.items.forEach(item => {
        const pIndex = data.products.findIndex(p => p.id === item.product_id);
        if (pIndex !== -1) {
          const product = data.products[pIndex];
          const size = item.size || 'M';
          if (product.stock && typeof product.stock === 'object') {
            product.stock[size] = (product.stock[size] || 0) + item.quantity;
          } else if (typeof product.stock === 'number') {
            product.stock = product.stock + item.quantity;
          }
          product.updated_at = new Date().toISOString();
        }
      });
    }

    writeDb(data);
    return order;
  },

  // --- STATS ---
  getStats: () => {
    const data = readDb();
    const paidOrders = data.orders.filter(o => o.status === 'paid');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);

    return {
      totalProducts: data.products.length,
      totalOrders: data.orders.length,
      paidOrders: paidOrders.length,
      totalRevenue: totalRevenue
    };
  }
};

// Initialize file on startup
readDb();

module.exports = db;
