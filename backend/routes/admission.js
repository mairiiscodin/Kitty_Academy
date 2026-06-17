const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, admissionOnly } = require('../middleware/auth');

const logDbError = (label, err) => {
  console.error(`\n${label}`);
  console.error('code:', err.code);
  console.error('errno:', err.errno);
  console.error('sqlMessage:', err.sqlMessage);
  console.error('message:', err.message);
  console.error('sql:', err.sql);
};

router.use(authMiddleware, admissionOnly);

router.get('/dashboard', async (req, res) => {
  try {
    const [[{ total_classes }]] = await db.query('SELECT COUNT(*) as total_classes FROM classes WHERE is_active=TRUE');
    const [[{ vip_classes }]] = await db.query("SELECT COUNT(*) as vip_classes FROM classes WHERE type='vip' AND is_active=TRUE");
    const [[{ trial_classes }]] = await db.query("SELECT COUNT(*) as trial_classes FROM classes WHERE type='trial' AND is_active=TRUE");
    const [[{ total_students }]] = await db.query("SELECT COUNT(*) as total_students FROM users WHERE role='student' AND is_active=TRUE");
    res.json({ success: true, stats: { total_classes, vip_classes, trial_classes, total_students } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Loi server' });
  }
});

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
    res.status(500).json({ success: false, message: 'Loi server' });
  }
});

// Helper: Kiểm tra xung đột lịch biểu giáo viên
const checkTeacherScheduleConflict = async (conn, teacherId, dayOfWeek, startTime, endTime, excludeClassId = null) => {
  const params = [teacherId, dayOfWeek, startTime, endTime];
  let excludeClause = '';
  
  if (excludeClassId) {
    excludeClause = ' AND c.id != ?';
    params.push(excludeClassId);
  }
  
  const [conflicts] = await conn.query(`
    SELECT s.id FROM schedules s
    JOIN classes c ON c.id = s.class_id AND c.is_active = TRUE
    WHERE s.teacher_id = ? AND s.day_of_week = ? AND s.is_active = TRUE
    AND ? < s.end_time AND ? > s.start_time
    ${excludeClause}
    LIMIT 1
  `, params);
  
  return conflicts.length > 0;
};

router.post('/classes', async (req, res) => {
  const { name, type, description, trial_student_name, class_link, teacher_id, day_of_week, start_time, end_time } = req.body;
  if (type !== 'trial') {
    return res.status(403).json({ success: false, message: 'Tu van tuyen sinh chi duoc tao lop trai nghiem' });
  }
  if (!name || !trial_student_name?.trim()) {
    return res.status(400).json({ success: false, message: 'Vui long nhap ten lop va ten hoc sinh' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Kiểm tra xung đột lịch biểu nếu có teacher_id và schedule
    if (teacher_id && day_of_week != null && start_time && end_time) {
      const hasConflict = await checkTeacherScheduleConflict(conn, teacher_id, day_of_week, start_time, end_time);
      if (hasConflict) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Giao vien da co lop khac vao thoi gian nay' });
      }
    }

    const [result] = await conn.query(
      'INSERT INTO classes (name, type, description, trial_student_name, class_link, max_students, total_sessions, teacher_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, 'trial', description || null, trial_student_name.trim(), class_link || null, 1, 1, teacher_id || null]
    );
    const classId = result.insertId;

    if (teacher_id && day_of_week != null && start_time && end_time) {
      await conn.query(
        'INSERT INTO schedules (class_id, teacher_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
        [classId, teacher_id, day_of_week, start_time, end_time]
      );
    }

    await conn.commit();
    res.json({ success: true, message: 'Da tao lop trai nghiem', id: classId });
  } catch (err) {
    await conn.rollback();
    logDbError('ADMISSION CREATE CLASS ERROR', err);
    res.status(500).json({ success: false, message: err.sqlMessage || err.message || 'Loi server' });
  } finally {
    conn.release();
  }
});

router.put('/classes/:id', async (req, res) => {
  const { name, type, description, trial_student_name, class_link, teacher_id, day_of_week, start_time, end_time } = req.body;
  if (type !== 'trial') {
    return res.status(403).json({ success: false, message: 'Tu van tuyen sinh chi duoc sua lop trai nghiem' });
  }
  if (!name || !trial_student_name?.trim()) {
    return res.status(400).json({ success: false, message: 'Vui long nhap ten lop va ten hoc sinh' });
  }

  const classId = req.params.id;
  const teacherId = teacher_id || null;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Kiểm tra xung đột lịch biểu nếu có teacher_id mới và schedule
    if (teacherId && day_of_week != null && start_time && end_time) {
      const hasConflict = await checkTeacherScheduleConflict(conn, teacherId, day_of_week, start_time, end_time, classId);
      if (hasConflict) {
        await conn.rollback();
        return res.status(400).json({ success: false, message: 'Giao vien da co lop khac vao thoi gian nay' });
      }
    }

    const [result] = await conn.query(
      "UPDATE classes SET name=?, description=?, trial_student_name=?, class_link=?, max_students=1, total_sessions=1, teacher_id=? WHERE id=? AND type='trial' AND is_active=TRUE",
      [name, description || null, trial_student_name.trim(), class_link || null, teacherId, classId]
    );
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Khong tim thay lop trai nghiem' });
    }

    if (teacherId) {
      const [activeSchedules] = await conn.query('SELECT id FROM schedules WHERE class_id=? AND is_active=TRUE', [classId]);
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
      await conn.query('UPDATE schedules SET is_active=FALSE WHERE class_id=? AND is_active=TRUE', [classId]);
    }

    await conn.commit();
    res.json({ success: true, message: 'Da cap nhat lop trai nghiem' });
  } catch (err) {
    logDbError('ADMISSION UPDATE CLASS ERROR', err);
    await conn.rollback();
    res.status(500).json({ success: false, message: err.sqlMessage || err.message || 'Loi server' });
  } finally {
    conn.release();
  }
});

router.delete('/classes/:id', async (req, res) => {
  try {
    const [result] = await db.query(
      "UPDATE classes SET is_active=FALSE WHERE id=? AND type='trial'",
      [req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Khong tim thay lop trai nghiem' });
    }
    res.json({ success: true, message: 'Da xoa lop trai nghiem' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Loi server' });
  }
});

router.put('/classes/:id/total-sessions', async (req, res) => {
  const totalSessions = Number(req.body.total_sessions);
  if (!Number.isInteger(totalSessions) || totalSessions < 1 || totalSessions > 300) {
    return res.status(400).json({ success: false, message: 'Tong so buoi khong hop le' });
  }

  try {
    const [result] = await db.query(
      "UPDATE classes SET total_sessions=? WHERE id=? AND type='trial' AND is_active=TRUE",
      [totalSessions, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Khong tim thay lop trai nghiem' });
    }
    res.json({ success: true, message: 'Da cap nhat tong so buoi' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Loi server' });
  }
});

router.get('/teachers', async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, username, full_name, email, is_active, created_at FROM users WHERE role='teacher' ORDER BY created_at DESC"
    );
    res.json({ success: true, teachers: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Loi server' });
  }
});

router.get('/students', async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, username, full_name, email, is_active, created_at FROM users WHERE role='student' ORDER BY created_at DESC"
    );
    res.json({ success: true, students: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Loi server' });
  }
});

module.exports = router;
