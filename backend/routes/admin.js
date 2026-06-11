const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use(authMiddleware, adminOnly);

// DASHBOARD
router.get('/dashboard', async (req, res) => {
  try {
    const [[{ total_users }]] = await db.query('SELECT COUNT(*) as total_users FROM users WHERE is_active = TRUE');
    const [[{ total_teachers }]] = await db.query("SELECT COUNT(*) as total_teachers FROM users WHERE role = 'teacher' AND is_active = TRUE");
    const [[{ total_students }]] = await db.query("SELECT COUNT(*) as total_students FROM users WHERE role = 'student' AND is_active = TRUE");
    const [[{ total_classes }]] = await db.query('SELECT COUNT(*) as total_classes FROM classes WHERE is_active = TRUE');
    const [[{ vip_classes }]] = await db.query("SELECT COUNT(*) as vip_classes FROM classes WHERE type = 'vip' AND is_active = TRUE");
    const [[{ trial_classes }]] = await db.query("SELECT COUNT(*) as trial_classes FROM classes WHERE type = 'trial' AND is_active = TRUE");
    res.json({ success: true, stats: { total_users, total_teachers, total_students, total_classes, vip_classes, trial_classes } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// USERS
router.get('/users', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, username, full_name, role, email, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json({ success: true, users: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

router.post('/users', async (req, res) => {
  const { username, password, full_name, role, email } = req.body;
  if (!username || !password || !full_name) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
  }
  try {
    // Lưu plain text
    const [result] = await db.query(
      'INSERT INTO users (username, password, full_name, role, email) VALUES (?, ?, ?, ?, ?)',
      [username, password, full_name, role || 'student', email || null]
    );
    res.json({ success: true, message: 'Tạo tài khoản thành công', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Tên tài khoản đã tồn tại' });
    }
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

router.put('/users/:id', async (req, res) => {
  const { full_name, role, email, is_active, password } = req.body;
  const { id } = req.params;
  try {
    if (password) {
      await db.query(
        'UPDATE users SET full_name=?, role=?, email=?, is_active=?, password=? WHERE id=?',
        [full_name, role, email, is_active, password, id]
      );
    } else {
      await db.query(
        'UPDATE users SET full_name=?, role=?, email=?, is_active=? WHERE id=?',
        [full_name, role, email, is_active, id]
      );
    }
    res.json({ success: true, message: 'Cập nhật thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await db.query('UPDATE users SET is_active = FALSE WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Đã vô hiệu hóa tài khoản' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// CLASSES
router.get('/classes', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, u.full_name as teacher_name 
       FROM classes c LEFT JOIN users u ON c.teacher_id = u.id 
       WHERE c.is_active = TRUE ORDER BY c.created_at DESC`
    );
    res.json({ success: true, classes: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

router.post('/classes', async (req, res) => {
  const { name, type, description, max_students, teacher_id } = req.body;
  if (!name || !type) return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
  try {
    const [result] = await db.query(
      'INSERT INTO classes (name, type, description, max_students, teacher_id) VALUES (?, ?, ?, ?, ?)',
      [name, type, description || null, max_students || 30, teacher_id || null]
    );
    res.json({ success: true, message: 'Tạo lớp học thành công', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

router.put('/classes/:id', async (req, res) => {
  const { name, type, description, max_students, teacher_id } = req.body;
  try {
    await db.query(
      'UPDATE classes SET name=?, type=?, description=?, max_students=?, teacher_id=? WHERE id=?',
      [name, type, description, max_students, teacher_id || null, req.params.id]
    );
    res.json({ success: true, message: 'Cập nhật lớp học thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

router.delete('/classes/:id', async (req, res) => {
  try {
    await db.query('UPDATE classes SET is_active = FALSE WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Đã xóa lớp học' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// TEACHERS
router.get('/teachers', async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, username, full_name, email, is_active, created_at FROM users WHERE role = 'teacher' ORDER BY created_at DESC"
    );
    res.json({ success: true, teachers: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// STUDENTS
router.get('/students', async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, username, full_name, email, is_active, created_at FROM users WHERE role = 'student' ORDER BY created_at DESC"
    );
    res.json({ success: true, students: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

module.exports = router;

// UPDATE SCHEDULE (khi sửa lớp kèm lịch)
router.put('/schedules/:id', async (req, res) => {
  const { day_of_week, start_time, end_time, teacher_id } = req.body;
  try {
    await db.query(
      'UPDATE schedules SET day_of_week=?, start_time=?, end_time=?, teacher_id=? WHERE id=?',
      [day_of_week, start_time, end_time, teacher_id, req.params.id]
    );
    res.json({ success: true, message: 'Cập nhật lịch thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});
