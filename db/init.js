const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'store.db');
const db = new Database(dbPath);

console.log('Initializing database at:', dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,
    description TEXT,
    price       REAL NOT NULL,
    stock       INTEGER NOT NULL DEFAULT 0,
    weight      REAL NOT NULL DEFAULT 500, -- weight in grams for shipping
    size        TEXT,                      -- S,M,L,XL,XXL
    color       TEXT,
    fabric      TEXT,
    image       TEXT,                      -- Image filename
    is_active   INTEGER DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number    TEXT UNIQUE NOT NULL,
    customer_name   TEXT NOT NULL,
    customer_phone  TEXT NOT NULL,
    customer_email  TEXT,
    customer_address TEXT NOT NULL,
    city            TEXT NOT NULL,
    pincode         TEXT NOT NULL,
    subtotal        REAL NOT NULL,
    shipping        REAL DEFAULT 0,
    total           REAL NOT NULL,
    status          TEXT DEFAULT 'pending', -- pending, paid, shipped, delivered, cancelled
    payment_id      TEXT,
    payment_status  TEXT DEFAULT 'pending', -- pending, completed, failed
    razorpay_order_id TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id    INTEGER NOT NULL,
    product_id  INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    quantity    INTEGER NOT NULL,
    size        TEXT,
    price       REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS admins (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT UNIQUE NOT NULL,
    password  TEXT NOT NULL
  );
`);

console.log('Tables created successfully.');

// Seed Admin User (username: admin, password: adminpassword123)
const adminCheck = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
if (!adminCheck) {
  const hashedPassword = bcrypt.hashSync('adminpassword123', 10);
  db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run('admin', hashedPassword);
  console.log('Seed: Created default admin user (username: admin, password: adminpassword123)');
} else {
  console.log('Seed: Admin user already exists.');
}

// Seed default products if empty
const productCount = db.prepare('SELECT count(*) as count FROM products').get().count;
if (productCount === 0) {
  const seedProducts = [
    {
      name: "Burgundy Elegance Salwar Kameez",
      category: "salwar",
      description: "Classic silhouette with modern detailing. Features premium georgette fabric with intricate gold zari embroidery and a chiffon dupatta.",
      price: 1899.00,
      stock: 15,
      weight: 600, // 600 grams
      size: "M,L,XL",
      color: "Burgundy",
      fabric: "Georgette & Chiffon",
      image: "hero_banner.png",
      is_active: 1
    },
    {
      name: "Emerald Green Anarkali Suit",
      category: "anarkali",
      description: "Flowing floor-length elegance for weddings and celebrations. Exquisite thread and sequin work on pure silk.",
      price: 2499.00,
      stock: 8,
      weight: 800, // 800 grams
      size: "S,M,L,XL",
      color: "Emerald Green",
      fabric: "Silk",
      image: "collection_anarkali.png",
      is_active: 1
    },
    {
      name: "Royal Blue Palazzo Set",
      category: "palazzo",
      description: "Contemporary comfort meets ethnic charm. A gorgeous palazzo suit set in royal blue with detailed silver embroidery.",
      price: 1599.00,
      stock: 12,
      weight: 500, // 500 grams
      size: "M,L,XL,XXL",
      color: "Royal Blue",
      fabric: "Rayon Blend",
      image: "collection_palazzo.png",
      is_active: 1
    }
  ];

  const insert = db.prepare(`
    INSERT INTO products (name, category, description, price, stock, weight, size, color, fabric, image, is_active)
    VALUES (@name, @category, @description, @price, @stock, @weight, @size, @color, @fabric, @image, @is_active)
  `);

  const insertMany = db.transaction((prods) => {
    for (const prod of prods) insert.run(prod);
  });

  insertMany(seedProducts);
  console.log('Seed: Inserted initial products.');
} else {
  console.log('Seed: Products already exist in database.');
}

console.log('Database initialization completed.');
db.close();
