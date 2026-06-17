const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ success: false, message: 'Không có token xác thực' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kitty_secret');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Chỉ admin mới có quyền truy cập' });
  }
  next();
};

const admissionOnly = (req, res, next) => {
  if (req.user?.role !== 'admission') {
    return res.status(403).json({ success: false, message: 'Chi tu van tuyen sinh moi co quyen truy cap' });
  }
  next();
};

module.exports = { authMiddleware, adminOnly, admissionOnly };
