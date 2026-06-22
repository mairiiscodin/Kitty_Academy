const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ===============================
// CORS CONFIG
// ===============================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://kitty-academy.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Cho phép Postman / server request không có origin
    if (!origin) {
      return callback(null, true);
    }

    // Cho phép các origin trong danh sách
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Cho phép các preview domain của Vercel
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    console.log('❌ CORS blocked:', origin);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middleware CORS
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// ===============================
// Middleware
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// Routes
// ===============================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admission', require('./routes/admission'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/student', require('./routes/student'));

// ===============================
// Health check
// ===============================
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Kitty Academy API is running 🚀',
    time: new Date().toISOString(),
    frontend_url: process.env.FRONTEND_URL || 'not set',
    allowedOrigins,
  });
});

app.get('/api/health-db', async (req, res) => {
  try {
    await db.query('SELECT 1');

    res.json({
      success: true,
      db: 'connected',
      time: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      db: 'error',
      message: err.message,
    });
  }
});

// ===============================
// 404 handler
// ===============================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} không tồn tại`,
  });
});

// ===============================
// Global error handler
// ===============================
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.message);

  res.status(500).json({
    success: false,
    message: err.message || 'Lỗi server không xác định',
  });
});

// ===============================
// Start server
// ===============================
app.listen(PORT, () => {
  console.log(`🚀 Kitty Academy Backend đang chạy tại port ${PORT}`);
  console.log(`📋 Health check: /api/health`);
  console.log('🌐 Allowed origins:', allowedOrigins);
});
