const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const cors = require('cors');
const crypto = require('crypto');
const { createClient } = require('redis');

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger');

const app = express();
const PORT = process.env.PORT || 5002;

app.use('/swagger', swaggerUi.serve);
app.get('/swagger', swaggerUi.setup(swaggerDocument));
app.get('/swagger/', swaggerUi.setup(swaggerDocument));

app.use(cors());
app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lamp_store',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (error) => {
  console.error('Redis connection error:', error);
});

const IDEMPOTENCY_TTL = 24 * 60 * 60;

const productCache = new Map();
const PRODUCT_CACHE_TTL = 45 * 1000;

let cacheHits = 0;
let cacheMisses = 0;
let cacheBypasses = 0;

const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}${month}${day}-${random}`;
};

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.post('/api/checkout', async (req, res) => {
  let connection;

  try {
    const idempotencyKey = req.get('Idempotency-Key')?.trim();

    if (!idempotencyKey || idempotencyKey.length > 255) {
      return res.status(400).json({
        error: 'Потрібен коректний Idempotency-Key'
      });
    }

    const userId = 1;
    const { firstName, lastName, age, email, phone } = req.body;

    if (
      !firstName?.trim() ||
      !lastName?.trim() ||
      !age ||
      !email?.trim() ||
      !phone?.trim()
    ) {
      return res.status(400).json({
        error: 'Всі поля обов\'язкові для заповнення'
      });
    }

    const parsedAge = parseInt(age, 10);

    if (!Number.isFinite(parsedAge) || parsedAge < 18) {
      return res.status(400).json({
        error: 'Вам має бути щонайменше 18 років'
      });
    }

    const normalizedPayload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      age: parsedAge,
      email: email.trim(),
      phone: phone.trim()
    };

    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(normalizedPayload))
      .digest('hex');
    const redisKey = `idempotency:${userId}:${idempotencyKey}`;

    const cachedResult = await redisClient.get(redisKey);

    if (cachedResult) {
      const cached = JSON.parse(cachedResult);

      if (cached.requestHash !== requestHash) {
        return res.status(409).json({
          error: 'Цей Idempotency-Key вже використаний з іншими даними'
        });
      }

      return res
        .status(cached.responseStatus)
        .json(cached.responseBody);
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.execute(
      `DELETE FROM idempotency_keys
      WHERE user_id = ?
        AND idempotency_key = ?
        AND created_at <= NOW() - INTERVAL 24 HOUR`,
      [userId, idempotencyKey]
    );

    try {
      await connection.execute(
        `INSERT INTO idempotency_keys
          (user_id, idempotency_key, request_hash)
         VALUES (?, ?, ?)`,
        [userId, idempotencyKey, requestHash]
      );
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') {
        throw error;
      }

      const [rows] = await connection.execute(
        `SELECT
          request_hash,
          response_status,
          response_body,
          TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age_seconds
        FROM idempotency_keys
        WHERE user_id = ?
          AND idempotency_key = ?
        FOR UPDATE`,
        [userId, idempotencyKey]
      );

      if (rows.length === 0) {
        throw error;
      }

      const existing = rows[0];

      if (existing.request_hash !== requestHash) {
        await connection.rollback();

        return res.status(409).json({
          error: 'Цей Idempotency-Key вже використаний з іншими даними'
        });
      }

      if (!existing.response_body) {
        await connection.rollback();

        return res.status(409).json({
          error: 'Попередній запит ще не має збереженої відповіді'
        });
      }

      const savedResponse =
        typeof existing.response_body === 'string'
          ? JSON.parse(existing.response_body)
          : existing.response_body;

      await connection.commit();

      const remainingTtl =
        IDEMPOTENCY_TTL - Number(existing.age_seconds);

      if (remainingTtl > 0) {
        await redisClient.set(
          redisKey,
          JSON.stringify({
            requestHash,
            responseStatus: existing.response_status,
            responseBody: savedResponse
          }),
          { EX: remainingTtl }
        );
      }

      return res.status(existing.response_status).json(savedResponse);
    }

    const [cartItems] = await connection.execute(`
      SELECT ci.*, p.title, p.price, p.image, p.stock
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ?
    `, [userId]);

    if (cartItems.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        error: 'Кошик порожній'
      });
    }

    for (const item of cartItems) {
      if (item.quantity > item.stock) {
        await connection.rollback();

        return res.status(400).json({
          error: `Недостатньо товару "${item.title}" на складі`
        });
      }
    }

    const totalAmount = cartItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);

    const totalQuantity = cartItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const orderNumber = generateOrderNumber();

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (
        order_number, user_id, first_name, last_name,
        age, email, phone, total_amount, total_quantity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        userId,
        normalizedPayload.firstName,
        normalizedPayload.lastName,
        normalizedPayload.age,
        normalizedPayload.email,
        normalizedPayload.phone,
        totalAmount,
        totalQuantity
      ]
    );

    const orderId = orderResult.insertId;

    for (const item of cartItems) {
      await connection.execute(
        `INSERT INTO order_items (
          order_id, product_id, title, price,
          quantity, temperature, image
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          item.product_id,
          item.title,
          item.price,
          item.quantity,
          item.temperature,
          item.image
        ]
      );
    }

    for (const item of cartItems) {
      await connection.execute(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    await connection.execute(
      'DELETE FROM cart_items WHERE user_id = ?',
      [userId]
    );

    const responseBody = {
      success: true,
      message: 'Замовлення успішно оформлено',
      orderNumber,
      orderId,
      totalAmount,
      totalQuantity
    };

    await connection.execute(
      `UPDATE idempotency_keys
       SET response_status = ?, response_body = ?
       WHERE user_id = ? AND idempotency_key = ?`,
      [
        200,
        JSON.stringify(responseBody),
        userId,
        idempotencyKey
      ]
    );

    await connection.commit();

    await redisClient.set(
      redisKey,
      JSON.stringify({
        requestHash,
        responseStatus: 200,
        responseBody
      }),
      { EX: IDEMPOTENCY_TTL }
    );

    productCache.clear();

    console.log(`Замовлення #${orderNumber} успішно створено`);

    return res.status(200).json(responseBody);

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error('Error during checkout:', error);

    return res.status(500).json({
      error: 'Помилка при оформленні замовлення',
      message: error.message
    });

  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/orders', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const userId = 1;

    const [orders] = await connection.execute(`
      SELECT * FROM orders 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `, [userId]);

    for (let order of orders) {
      const [items] = await connection.execute(`
        SELECT * FROM order_items 
        WHERE order_id = ? 
        ORDER BY id
      `, [order.id]);
      order.items = items;
    }

    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Помилка сервера', message: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/orders/:orderNumber', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { orderNumber } = req.params;
    const userId = 1;

    const [orders] = await connection.execute(`
      SELECT * FROM orders 
      WHERE order_number = ? AND user_id = ?
    `, [orderNumber, userId]);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Замовлення не знайдено' });
    }

    const order = orders[0];
    
    const [items] = await connection.execute(`
      SELECT * FROM order_items 
      WHERE order_id = ? 
      ORDER BY id
    `, [order.id]);
    
    order.items = items;

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Помилка сервера', message: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/products', async (req, res) => {
  let connection;

  const cacheKey = req.originalUrl;
  const bypassCache = req.query.cache === 'off';

  if (bypassCache) {
    cacheBypasses++;
    res.set('X-Cache', 'BYPASS');
  } else {
    const cached = productCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      cacheHits++;
      res.set('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    if (cached) {
      productCache.delete(cacheKey);
    }

    cacheMisses++;
  }

  try {
    connection = await pool.getConnection();

    const {
      search,
      type,
      manufacturer,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder
    } = req.query;

    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ? OR manufacturer LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (manufacturer) {
      query += ' AND manufacturer = ?';
      params.push(manufacturer);
    }

    if (minPrice) {
      query += ' AND price >= ?';
      params.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      query += ' AND price <= ?';
      params.push(parseFloat(maxPrice));
    }

    if (sortBy === 'price') {
      const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
      query += ` ORDER BY price ${order}`;
    } else {
      query += ' ORDER BY id ASC';
    }

    const [rows] = await connection.execute(query, params);

    if (!bypassCache) {
      productCache.set(cacheKey, {
        data: rows,
        expiresAt: Date.now() + PRODUCT_CACHE_TTL
      });

      res.set('X-Cache', 'MISS');
    }

    res.json(rows);

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      error: 'Помилка сервера',
      message: error.message
    });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/products/:id', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const productId = parseInt(req.params.id);
    
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Невірний ID продукту' });
    }
    
    const [rows] = await connection.execute('SELECT * FROM products WHERE id = ?', [productId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Продукт не знайдено' });
    }
    
    res.json(rows[0]);
    
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Помилка сервера', message: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/cart', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const userId = 1;
    
    const [rows] = await connection.execute(`
      SELECT ci.*, p.title, p.price, p.image, p.stock 
      FROM cart_items ci 
      JOIN products p ON ci.product_id = p.id 
      WHERE ci.user_id = ?
    `, [userId]);
    
    res.json(rows);
    
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Помилка сервера', message: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/api/cart', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { productId, quantity = 1, temperature = 'warm-white' } = req.body;
    const userId = 1;
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID обов\'язковий' });
    }
    
    const [productRows] = await connection.execute('SELECT * FROM products WHERE id = ?', [productId]);
    if (productRows.length === 0) {
      return res.status(404).json({ error: 'Продукт не знайдено' });
    }
    
    if (productRows[0].stock < quantity) {
      return res.status(400).json({ error: 'Недостатньо товару на складі' });
    }
    
    const [rows] = await connection.execute(
      'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ? AND temperature = ?', 
      [userId, productId, temperature]
    );
    
    if (rows.length > 0) {
      const newQuantity = rows[0].quantity + quantity;
      if (newQuantity > 10) {
        return res.status(400).json({ error: 'Максимальна кількість для одного товару - 10 шт.' });
      }
      await connection.execute(
        'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ? AND temperature = ?',
        [newQuantity, userId, productId, temperature]
      );
    } else {
      if (quantity > 10) {
        return res.status(400).json({ error: 'Максимальна кількість для одного товару - 10 шт.' });
      }
      await connection.execute(
        'INSERT INTO cart_items (user_id, product_id, quantity, temperature) VALUES (?, ?, ?, ?)',
        [userId, productId, quantity, temperature]
      );
    }
    
    res.json({ success: true, message: 'Товар додано до кошика' });
    
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: 'Помилка сервера', message: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.put('/api/cart/:productId', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { productId } = req.params;
    const { quantity, temperature = 'warm-white' } = req.body;
    const userId = 1;
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Кількість має бути більше 0' });
    }
    
    if (quantity > 10) {
      return res.status(400).json({ error: 'Максимальна кількість для одного товару - 10 шт.' });
    }
    
    await connection.execute(
      'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ? AND temperature = ?',
      [quantity, userId, productId, temperature]
    );
    
    res.json({ success: true, message: 'Кількість оновлено' });
    
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ error: 'Помилка сервера', message: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.delete('/api/cart/:productId', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const { productId } = req.params;
    const { temperature = 'warm-white' } = req.body;
    const userId = 1;
    
    await connection.execute(
      'DELETE FROM cart_items WHERE user_id = ? AND product_id = ? AND temperature = ?',
      [userId, productId, temperature]
    );
    
    res.json({ success: true, message: 'Товар видалено з кошика' });
    
  } catch (error) {
    console.error('Error deleting from cart:', error);
    res.status(500).json({ error: 'Помилка сервера', message: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.delete('/api/cart', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const userId = 1;
    
    await connection.execute('DELETE FROM cart_items WHERE user_id = ?', [userId]);
    
    res.json({ success: true, message: 'Кошик очищено' });
    
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ error: 'Помилка сервера', message: error.message });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Сервер працюєє', 
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/products',
      '/api/products/:id',
      '/api/cart',
      '/api/checkout',
      '/api/orders',
      '/api/orders/:orderNumber'
    ]
  });
});

app.get('/api/cache/stats', (req, res) => {
  const total = cacheHits + cacheMisses;

  res.json({
    hits: cacheHits,
    misses: cacheMisses,
    bypasses: cacheBypasses,
    hitRate: total
      ? Number((cacheHits / total * 100).toFixed(2))
      : 0,
    entries: productCache.size,
    ttlSeconds: 45
  });
});

const frontendPath = path.join(__dirname, '..', 'frontend', 'build');

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Маршрут не знайдено' });
});

app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const startServer = async () => {
  try {
    await redisClient.connect();

    app.listen(PORT, () => {
      console.log(`Сервер запущено на http://localhost:${PORT}`);
      console.log(`API доступне за адресою: http://localhost:${PORT}/api`);
      console.log('Redis успішно підключено');
    });
  } catch (error) {
    console.error('Не вдалося підключитися до Redis:', error);
    process.exit(1);
  }
};

startServer();