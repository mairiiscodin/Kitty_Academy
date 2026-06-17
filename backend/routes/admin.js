const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const sendDbError = (res, label, err, status = 500) => {
  console.error(`\n${label}`);
  console.error('code:', err.code);
  console.error('errno:', err.errno);
  console.error('sqlMessage:', err.sqlMessage);
  console.error('message:', err.message);
  console.error('sql:', err.sql);

  res.status(status).json({
    success: false,
    message: err.sqlMessage || err.message || 'Loi server',
  });
};

const hasTeacherScheduleConflict = async (conn, { teacherId, dayOfWeek, startTime, endTime, excludeClassId = null, excludeScheduleId = null }) => {
  const params = [teacherId, dayOfWeek, startTime, endTime];
  let excludeClause = '';

  if (excludeClassId) {
    excludeClause += ' AND s.class_id <> ?';
    params.push(excludeClassId);
  }

  if (excludeScheduleId) {
    excludeClause += ' AND s.id <> ?';
    params.push(excludeScheduleId);
  }

  const [rows] = await conn.query(
    `
      SELECT s.id
      FROM schedules s
      JOIN classes c ON c.id = s.class_id AND c.is_active = TRUE
      WHERE s.teacher_id = ?
        AND s.day_of_week = ?
        AND s.is_active = TRUE
        AND ? < s.end_time
        AND ? > s.start_time
        ${excludeClause}
      LIMIT 1
    `,
    params
  );

  return rows.length > 0;
};

const validateScheduleInput = (res, { teacherId, dayOfWeek, startTime, endTime }) => {
  if (!teacherId || dayOfWeek == null || !startTime || !endTime) return true;

  if (startTime >= endTime) {
    res.status(400).json({ success: false, message: 'Gio ket thuc phai lon hon gio bat dau' });
    return false;
  }

  return true;
};

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
        (SELECT COUNT(*) FROM students st WHERE st.class_id = c.id) as student_count,
        (SELECT COUNT(DISTINCT session_date) FROM session_comments WHERE class_id = c.id) as session_count
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

// Láº¥y danh sÃ¡ch há»c sinh cá»§a 1 lá»›p (kèm tiến trình học)
router.get('/classes/:id/students', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id, u.username, u.full_name, u.email, st.enrollment_date,
        (SELECT COUNT(*) FROM session_comments WHERE class_id = ? AND student_id = u.id AND attendance IN ('present', 'late')) as attended_sessions,
        (SELECT COALESCE(c.total_sessions, 10) FROM classes c WHERE c.id = ?) as total_sessions
      FROM students st
      JOIN users u ON u.id = st.user_id
      WHERE st.class_id = ?
      ORDER BY u.full_name
    `, [req.params.id, req.params.id, req.params.id]);
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
  const { name, type, description, trial_student_name, class_link, max_students, total_sessions, teacher_id, day_of_week, start_time, end_time, student_ids } = req.body;
  if (!name || !type)
    return res.status(400).json({ success: false, message: 'Thiáº¿u thÃ´ng tin báº¯t buá»™c' });
  if (type === 'trial' && !trial_student_name?.trim())
    return res.status(400).json({ success: false, message: 'Vui long nhap ten hoc sinh hoc thu' });
  if (!validateScheduleInput(res, { teacherId: teacher_id, dayOfWeek: day_of_week, startTime: start_time, endTime: end_time })) return;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 2.5. Kiểm tra xung đột lịch biểu nếu có teacher_id và schedule
    if (teacher_id && day_of_week != null && start_time && end_time) {
      const hasConflict = await hasTeacherScheduleConflict(conn, { teacherId: teacher_id, dayOfWeek: day_of_week, startTime: start_time, endTime: end_time });
      if (hasConflict) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Giao vien da co lop khac vao thoi gian nay' });
      }
    }

    // 1. Táº¡o lá»›p
    const [result] = await conn.query(
      'INSERT INTO classes (name, type, description, trial_student_name, class_link, max_students, total_sessions, teacher_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        type,
        description || null,
        type === 'trial' ? trial_student_name.trim() : null,
        class_link || null,
        type === 'trial' ? 1 : (max_students || 30),
        type === 'trial' ? 1 : (total_sessions || 10),
        teacher_id || null
      ]
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
    if (type !== 'trial' && Array.isArray(student_ids) && student_ids.length > 0) {
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
    console.error('DB ROLLBACK ERROR');
    console.error('code:', err.code);
    console.error('errno:', err.errno);
    console.error('sqlMessage:', err.sqlMessage);
    console.error('message:', err.message);
    console.error('sql:', err.sql);
    console.error('Class mutation error:', err);
    console.error('code:', err.code);
    console.error('errno:', err.errno);
    console.error('sqlMessage:', err.sqlMessage);
    console.error('message:', err.message);
    console.error('sql:', err.sql);
    res.status(400).json({ success: false, message: err.message || 'Lá»—i táº¡o lá»›p' });
  } finally {
    conn.release();
  }
});

router.put('/classes/:id', async (req, res) => {
  const { name, type, description, trial_student_name, class_link, max_students, total_sessions, teacher_id, day_of_week, start_time, end_time } = req.body;
  const classId = req.params.id;
  const teacherId = teacher_id || null;
  const conn = await db.getConnection();
  if (type === 'trial' && !trial_student_name?.trim())
    return res.status(400).json({ success: false, message: 'Vui long nhap ten hoc sinh hoc thu' });

  try {
    await conn.beginTransaction();

    // Kiểm tra xung đột lịch biểu nếu có teacher_id mới và schedule
    if (teacherId && day_of_week != null && start_time && end_time) {
      const [oldSchedules] = await conn.query('SELECT id FROM schedules WHERE class_id=? AND is_active=TRUE LIMIT 1', [classId]);
      const oldScheduleId = oldSchedules.length > 0 ? oldSchedules[0].id : null;
      
      const hasConflict = await hasTeacherScheduleConflict(conn, {
        teacherId: teacherId,
        dayOfWeek: day_of_week,
        startTime: start_time,
        endTime: end_time,
        excludeClassId: classId,
        excludeScheduleId: oldScheduleId
      });
      
      if (hasConflict) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Giao vien da co lop khac vao thoi gian nay' });
      }
    }

    await conn.query(
      'UPDATE classes SET name=?, type=?, description=?, trial_student_name=?, class_link=?, max_students=?, total_sessions=?, teacher_id=? WHERE id=?',
      [
        name,
        type,
        description,
        type === 'trial' ? trial_student_name.trim() : null,
        class_link || null,
        type === 'trial' ? 1 : max_students,
        type === 'trial' ? 1 : (total_sessions || 10),
        teacherId,
        classId
      ]
    );

    if (teacherId) {
      const [activeSchedules] = await conn.query(
        'SELECT id FROM schedules WHERE class_id=? AND is_active=TRUE',
        [classId]
      );

      if (activeSchedules.length > 0) {
        await conn.query(
          'UPDATE schedules SET teacher_id=?, day_of_week=?, start_time=?, end_time=? WHERE class_id=? AND is_active=TRUE',
          [teacherId, day_of_week, start_time, end_time, classId]
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
    sendDbError(res, 'ADMIN UPDATE CLASS ERROR', err);
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

// ===================== PROGRESS TRACKING =====================
// Xem chi tiết tiến trình tất cả học sinh của một lớp
router.get('/classes/:id/progress', async (req, res) => {
  try {
    const classId = req.params.id;
    const [[cls]] = await db.query('SELECT total_sessions FROM classes WHERE id=?', [classId]);
    
    if (!cls) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp' });
    }

    const [students] = await db.query(`
      SELECT u.id, u.full_name, u.username,
        COUNT(CASE WHEN sc.attendance IN ('present', 'late') THEN 1 END) as attended_sessions,
        COUNT(CASE WHEN sc.attendance = 'absent' THEN 1 END) as absent_sessions,
        COUNT(CASE WHEN sc.attendance IS NULL THEN 1 END) as not_recorded
      FROM students st
      JOIN users u ON u.id = st.user_id
      LEFT JOIN session_comments sc ON sc.class_id = ? AND sc.student_id = u.id
      WHERE st.class_id = ?
      GROUP BY u.id, u.full_name, u.username
      ORDER BY u.full_name
    `, [classId, classId]);

    const progress = students.map(s => ({
      ...s,
      total_sessions: cls.total_sessions,
      progress_percent: cls.total_sessions > 0 ? Math.round((s.attended_sessions / cls.total_sessions) * 100) : 0
    }));

    res.json({ success: true, total_sessions: cls.total_sessions, progress });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lá»—i server' });
  }
});

// Xem chi tiết lịch sử điểm danh của một học sinh
router.get('/classes/:classId/students/:studentId/attendance', async (req, res) => {
  try {
    const [records] = await db.query(`
      SELECT sc.*, 
        ROW_NUMBER() OVER (ORDER BY sc.session_date) as session_number
      FROM session_comments sc
      WHERE sc.class_id = ? AND sc.student_id = ?
      ORDER BY sc.session_date DESC
    `, [req.params.classId, req.params.studentId]);

    res.json({ success: true, attendance: records });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lá»—i server' });
  }
});

module.exports = router;
