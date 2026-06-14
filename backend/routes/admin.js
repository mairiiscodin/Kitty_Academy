const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use(authMiddleware, adminOnly);

// ===================== DASHBOARD =====================
router.get('/dashboard', async (req, res) => {
  try {
    const [[{ total_users }]]    = await db.query('SELECT COUNT(*) as total_users FROM users WHERE is_active = TRUE');
    const [[{ total_teachers }]] = await db.query("SELECT COUNT(*) as total_teachers FROM users WHERE role='teacher' AND is_active=TRUE");
    const [[{ total_students }]] = await db.query("SELECT COUNT(*) as total_students FROM users WHERE role='student' AND is_active=TRUE");
    const [[{ total_classes }]]  = await db.query('SELECT COUNT(*) as total_classes FROM classes WHERE is_active=TRUE');
    const [[{ vip_classes }]]    = await db.query("SELECT COUNT(*) as vip_classes FROM classes WHERE type='vip' AND is_active=TRUE");
    const [[{ trial_classes }]]  = await db.query("SELECT COUNT(*) as trial_classes FROM classes WHERE type='trial' AND is_active=TRUE");
    res.json({ success: true, stats: { total_users, total_teachers, total_students, total_classes, vip_classes, trial_classes } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lá»—i server' });
  }
});

// ===================== USERS =====================
router.get('/users', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, username, full_name, role, email, is_active, created_at FROM users ORDER BY created_at DESC');
    res.json({ success: true, users: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lá»—i server' });
  }
});

router.post('/users', async (req, res) => {
  const { username, password, full_name, role, email } = req.body;
  if (!username || !password || !full_name)
    return res.status(400).json({ success: false, message: 'Thiáº¿u thÃ´ng tin báº¯t buá»™c' });
  try {
    const [result] = await db.query(
      'INSERT INTO users (username, password, full_name, role, email) VALUES (?, ?, ?, ?, ?)',
      [username, password, full_name, role || 'student', email || null]
    );
    res.json({ success: true, message: 'Táº¡o tÃ i khoáº£n thÃ nh cÃ´ng', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ success: false, message: 'TÃªn tÃ i khoáº£n Ä‘Ã£ tá»“n táº¡i' });
    res.status(500).json({ success: false, message: 'Lá»—i server' });
  }
});

router.put('/users/:id', async (req, res) => {
  const { full_name, role, email, is_active, password } = req.body;
  try {
    if (password) {
      await db.query('UPDATE users SET full_name=?, role=?, email=?, is_active=?, password=? WHERE id=?',
        [full_name, role, email, is_active, password, req.params.id]);
    } else {
      await db.query('UPDATE users SET full_name=?, role=?, email=?, is_active=? WHERE id=?',
        [full_name, role, email, is_active, req.params.id]);
    }
    res.json({ success: true, message: 'Cáº­p nháº­t thÃ nh cÃ´ng' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lá»—i server' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await db.query('UPDATE users SET is_active=FALSE WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'ÄÃ£ vÃ´ hiá»‡u hÃ³a tÃ i khoáº£n' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lá»—i server' });
  }
});

// ===================== CLASSES =====================
router.get('/classes', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.*, u.full_name as teacher_name,
        s.day_of_week, s.start_time, s.end_time, s.id as schedule_id,
        (SELECT COUNT(*) FROM students st WHERE st.class_id = c.id) as student_count
      FROM classes c
      LEFT JOIN users u ON c.teacher_id = u.id
      LEFT JOIN schedules s ON s.class_id = c.id AND s.teacher_id = c.teacher_id
      WHERE c.is_active = TRUE
      ORDER BY c.created_at DESC
    `);
    res.json({ success: true, classes: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lá»—i server' });
  }
});

// Láº¥y danh sÃ¡ch há»c sinh cá»§a 1 lá»›p
router.get('/classes/:id/students', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.username, u.full_name, u.email, st.enrollment_date
      FROM students st
      JOIN users u ON u.id = st.user_id
      WHERE st.class_id = ?
      ORDER BY u.full_name
    `, [req.params.id]);
    res.json({ success: true, students: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lá»—i server' });
  }
});

// Láº¥y táº¥t cáº£ há»c sinh chÆ°a á»Ÿ trong lá»›p nÃ y (Ä‘á»ƒ chá»n thÃªm)
router.get('/classes/:id/available-students', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.username, u.full_name, u.email
      FROM users u
      WHERE u.role = 'student' AND u.is_active = TRUE
        AND u.id NOT IN (
          SELECT st.user_id FROM students st WHERE st.class_id = ?
        )
      ORDER BY u.full_name
    `, [req.params.id]);
    res.json({ success: true, students: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lá»—i server' });
  }
});

// Láº¥y táº¥t cáº£ há»c sinh (dÃ¹ng khi thÃªm lá»›p má»›i, chÆ°a cÃ³ class_id)
router.get('/students/all', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.username, u.full_name, u.email
      FROM users u
      WHERE u.role = 'student' AND u.is_active = TRUE
      ORDER BY u.full_name
    `);
    res.json({ success: true, students: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lá»—i server' });
  }
});

router.post('/classes', async (req, res) => {
  const { name, type, description, class_link, max_students, teacher_id, day_of_week, start_time, end_time, student_ids } = req.body;
  if (!name || !type)
    return res.status(400).json({ success: false, message: 'Thiáº¿u thÃ´ng tin báº¯t buá»™c' });
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Táº¡o lá»›p
    const [result] = await conn.query(
      'INSERT INTO classes (name, type, description, class_link, max_students, teacher_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, type, description || null, class_link || null, max_students || 30, teacher_id || null]
    );
    const classId = result.insertId;

    // 2. Táº¡o lá»‹ch náº¿u cÃ³
    if (teacher_id && day_of_week != null && start_time && end_time) {
      await conn.query(
        'INSERT INTO schedules (class_id, teacher_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
        [classId, teacher_id, day_of_week, start_time, end_time]
      );
    }

    // 3. ThÃªm há»c sinh náº¿u cÃ³
    if (Array.isArray(student_ids) && student_ids.length > 0) {
      const maxSt = max_students || 30;
      if (student_ids.length > maxSt)
        throw new Error(`VÆ°á»£t quÃ¡ sÄ© sá»‘ tá»‘i Ä‘a (${maxSt} há»c sinh)`);

      const vals = student_ids.map(sid => [sid, classId, new Date().toISOString().slice(0,10)]);
      await conn.query('INSERT IGNORE INTO students (user_id, class_id, enrollment_date) VALUES ?', [vals]);
    }

    await conn.commit();
    res.json({ success: true, message: 'Táº¡o lá»›p há»c thÃ nh cÃ´ng', id: classId });
  } catch (err) {
    await conn.rollback();
    res.status(400).json({ success: false, message: err.message || 'Lá»—i táº¡o lá»›p' });
  } finally {
    conn.release();
  }
});

router.put('/classes/:id', async (req, res) => {
  const { name, type, description, class_link, max_students, teacher_id, day_of_week, start_time, end_time } = req.body;
  const classId = req.params.id;
  const teacherId = teacher_id || null;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query(
      'UPDATE classes SET name=?, type=?, description=?, class_link=?, max_students=?, teacher_id=? WHERE id=?',
      [name, type, description, class_link || null, max_students, teacherId, classId]
    );

    if (teacherId) {
      const [activeSchedules] = await conn.query(
        'SELECT id FROM schedules WHERE class_id=? AND is_active=TRUE',
        [classId]
      );

      if (activeSchedules.length > 0) {
        await conn.query(
          'UPDATE schedules SET teacher_id=? WHERE class_id=? AND is_active=TRUE',
          [teacherId, classId]
        );
      } else if (day_of_week != null && start_time && end_time) {
        await conn.query(
          'INSERT INTO schedules (class_id, teacher_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
          [classId, teacherId, day_of_week, start_time, end_time]
        );
      }
    } else {
      await conn.query(
        'UPDATE schedules SET is_active=FALSE WHERE class_id=? AND is_active=TRUE',
        [classId]
      );
    }

    await conn.commit();
    res.json({ success: true, message: 'Cập nhật lớp học thành công' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Lỗi server' });
  } finally {
    conn.release();
  }
});
router.delete('/classes/:id', async (req, res) => {
  try {
    await db.query('UPDATE classes SET is_active=FALSE WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'ÄÃ£ xÃ³a lá»›p há»c' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lá»—i server' });
  }
});

// ThÃªm há»c sinh vÃ o lá»›p (dÃ¹ng khi edit)
router.post('/classes/:id/enroll', async (req, res) => {
  const { student_ids } = req.body;
  const classId = req.params.id;
  if (!Array.isArray(student_ids) || student_ids.length === 0)
    return res.status(400).json({ success: false, message: 'KhÃ´ng cÃ³ há»c sinh nÃ o Ä‘Æ°á»£c chá»n' });
  try {
    const [[cls]] = await db.query('SELECT max_students FROM classes WHERE id=?', [classId]);
    const [[{ cur }]] = await db.query('SELECT COUNT(*) as cur FROM students WHERE class_id=?', [classId]);
    if (cur + student_ids.length > cls.max_students)
      return res.status(400).json({ success: false, message: `VÆ°á»£t quÃ¡ sÄ© sá»‘ tá»‘i Ä‘a (${cls.max_students}). Hiá»‡n cÃ³ ${cur} há»c sinh.` });

    const vals = student_ids.map(sid => [sid, classId, new Date().toISOString().slice(0,10)]);
    await db.query('INSERT IGNORE INTO students (user_id, class_id, enrollment_date) VALUES ?', [vals]);
    res.json({ success: true, message: `ÄÃ£ thÃªm ${student_ids.length} há»c sinh vÃ o lá»›p` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lá»—i server' });
  }
});

// XÃ³a há»c sinh khá»i lá»›p
router.delete('/classes/:id/students/:studentId', async (req, res) => {
  try {
    await db.query('DELETE FROM students WHERE class_id=? AND user_id=?', [req.params.id, req.params.studentId]);
    res.json({ success: true, message: 'ÄÃ£ xÃ³a há»c sinh khá»i lá»›p' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lá»—i server' });
  }
});

// ===================== SCHEDULES =====================
router.put('/schedules/:id', async (req, res) => {
  const { day_of_week, start_time, end_time, teacher_id } = req.body;
  try {
    await db.query(
      'UPDATE schedules SET day_of_week=?, start_time=?, end_time=?, teacher_id=? WHERE id=?',
      [day_of_week, start_time, end_time, teacher_id, req.params.id]
    );
    res.json({ success: true, message: 'Cáº­p nháº­t lá»‹ch thÃ nh cÃ´ng' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lá»—i server' });
  }
});

// ===================== TEACHERS =====================
router.get('/teachers', async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, username, full_name, email, is_active, created_at FROM users WHERE role='teacher' ORDER BY created_at DESC"
    );
    res.json({ success: true, teachers: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lá»—i server' });
  }
});

// ===================== STUDENTS =====================
router.get('/students', async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, username, full_name, email, is_active, created_at FROM users WHERE role='student' ORDER BY created_at DESC"
    );
    res.json({ success: true, students: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lá»—i server' });
  }
});

module.exports = router;
