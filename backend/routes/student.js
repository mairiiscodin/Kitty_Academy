const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);
const TIME_SLOTS = new Set(['18:00-18:45', '18:45-19:30', '19:30-20:15', '20:15-21:00']);

const ensureAvailabilityTable = async (conn = db) => {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS availability_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      role ENUM('teacher', 'student') NOT NULL,
      day_of_week TINYINT NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_availability_user_slot (user_id, role, day_of_week, start_time, end_time),
      INDEX idx_availability_role_slot (role, day_of_week, start_time, end_time),
      CONSTRAINT fk_availability_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

const normalizeAvailabilitySlots = (slots) => {
  if (!Array.isArray(slots)) return [];
  return slots
    .map(slot => {
      const day = Number(slot.day_of_week);
      const range = `${String(slot.start_time || '').substring(0, 5)}-${String(slot.end_time || '').substring(0, 5)}`;
      if (!Number.isInteger(day) || day < 0 || day > 6 || !TIME_SLOTS.has(range)) return null;
      return { day_of_week: day, start_time: range.slice(0, 5), end_time: range.slice(6) };
    })
    .filter(Boolean)
    .filter((slot, index, arr) => arr.findIndex(item => (
      item.day_of_week === slot.day_of_week &&
      item.start_time === slot.start_time &&
      item.end_time === slot.end_time
    )) === index);
};

const notifyAdminsAvailability = async (conn, { senderId, senderName, slots, note }) => {
  const [admins] = await conn.query("SELECT id FROM users WHERE role='admin' AND is_active=TRUE");
  if (admins.length === 0) return;
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const slotText = slots.map(slot => `${days[slot.day_of_week]} ${slot.start_time}-${slot.end_time}`).join(', ');
  const noteText = note?.trim() ? ` Ghi chú: ${note.trim()}` : '';
  const rows = admins.map(admin => [
    admin.id,
    senderId,
    'system',
    'Học sinh đăng ký lịch học',
    `${senderName} đã đăng ký lịch học: ${slotText || 'chưa chọn khung giờ'}.${noteText} Admin có thể tạo lớp từ thông báo này hoặc vào giao diện thêm lớp để chọn giờ, giáo viên và học sinh phù hợp.`,
  ]);
  await conn.query('INSERT INTO notifications (user_id, sender_id, type, title, message) VALUES ?', [rows]);
};

const attachTeacherAvailability = async (rows) => {
  await ensureAvailabilityTable();
  const ids = rows.map(row => row.id);
  if (ids.length === 0) return rows;
  const [slots] = await db.query(
    `SELECT user_id, day_of_week, TIME_FORMAT(start_time, '%H:%i') as start_time, TIME_FORMAT(end_time, '%H:%i') as end_time
     FROM availability_requests
     WHERE role='teacher' AND user_id IN (?)
     ORDER BY day_of_week, start_time`,
    [ids]
  );
  const byUser = slots.reduce((acc, slot) => {
    if (!acc[slot.user_id]) acc[slot.user_id] = [];
    acc[slot.user_id].push(slot);
    return acc;
  }, {});
  rows.forEach(row => {
    row.availability = byUser[row.id] || [];
  });
  return rows;
};

const normalizeClassSchedules = (schedules) => {
  if (!Array.isArray(schedules)) return [];
  return schedules
    .map(schedule => {
      const day = Number(schedule.day_of_week);
      const range = `${String(schedule.start_time || '').substring(0, 5)}-${String(schedule.end_time || '').substring(0, 5)}`;
      if (!Number.isInteger(day) || day < 0 || day > 6 || !TIME_SLOTS.has(range)) return null;
      return { day_of_week: day, start_time: range.slice(0, 5), end_time: range.slice(6) };
    })
    .filter(Boolean)
    .filter((slot, index, arr) => arr.findIndex(item => (
      item.day_of_week === slot.day_of_week &&
      item.start_time === slot.start_time &&
      item.end_time === slot.end_time
    )) === index);
};

const notifyAdminsClassRegistration = async (conn, { senderId, senderName, className, schedules, teacherName }) => {
  const [admins] = await conn.query("SELECT id FROM users WHERE role='admin' AND is_active=TRUE");
  if (admins.length === 0) return;

  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const scheduleText = schedules
    .map(slot => `${days[slot.day_of_week]} ${slot.start_time}-${slot.end_time}`)
    .join(', ');
  const teacherText = teacherName ? ` Giáo viên: ${teacherName}.` : '';
  const message = `${senderName} đã đăng ký lớp ${className}. Lịch học: ${scheduleText || 'chưa có lịch'}.${teacherText}`;

  const rows = admins.map(admin => [
    admin.id,
    senderId,
    'system',
    'Học sinh đăng ký lớp',
    message,
  ]);
  await conn.query('INSERT INTO notifications (user_id, sender_id, type, title, message) VALUES ?', [rows]);
};

const notifyAdminsClassCancellation = async (conn, { senderId, senderName, className }) => {
  const [admins] = await conn.query("SELECT id FROM users WHERE role='admin' AND is_active=TRUE");
  if (admins.length === 0) return;
  const rows = admins.map(admin => [
    admin.id,
    senderId,
    'system',
    'Học sinh hủy đăng ký lớp',
    `${senderName} đã hủy đăng ký lớp ${className}.`,
  ]);
  await conn.query('INSERT INTO notifications (user_id, sender_id, type, title, message) VALUES ?', [rows]);
};

const studentOnly = (req, res, next) => {
  if (!['student', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Chỉ học sinh mới có quyền truy cập' });
  }
  next();
};

// ===================== ONLINE PING =====================
router.post('/ping', async (req, res) => {
  try {
    await db.query(
      `INSERT INTO user_sessions (user_id, is_online, last_seen) VALUES (?, TRUE, NOW())
       ON DUPLICATE KEY UPDATE is_online = TRUE, last_seen = NOW()`,
      [req.user.id]
    );
    res.json({ success: true });
  } catch { res.status(500).json({ success: false }); }
});

router.post('/offline', async (req, res) => {
  try {
    await db.query('UPDATE user_sessions SET is_online = FALSE WHERE user_id = ?', [req.user.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ success: false }); }
});

// ===================== DASHBOARD =====================
router.get('/dashboard', studentOnly, async (req, res) => {
  const studentId = req.user.id;
  try {
    // Lớp hiện tại của học sinh (qua bảng students)
    const [myClasses] = await db.query(
      `SELECT c.*, s.day_of_week, s.start_time, s.end_time, s.id as schedule_id,
              u.full_name as teacher_name,
              c.total_sessions,
              (SELECT COUNT(DISTINCT sc.session_date) FROM session_comments sc WHERE sc.class_id = c.id) as class_session_count,
              (SELECT COUNT(*) FROM session_comments sc WHERE sc.class_id = c.id AND sc.student_id = st.user_id) as recorded_sessions,
              (SELECT COUNT(*) FROM session_comments sc WHERE sc.class_id = c.id AND sc.student_id = st.user_id AND sc.attendance IN ('present','late')) as learned_sessions,
              (SELECT COUNT(*) FROM session_comments sc WHERE sc.class_id = c.id AND sc.student_id = st.user_id AND sc.attendance = 'absent') as absent_sessions
       FROM students st
       JOIN classes c ON c.id = st.class_id
       JOIN schedules s ON s.class_id = c.id AND s.is_active = TRUE
       JOIN users u ON u.id = s.teacher_id
       WHERE st.user_id = ? AND c.is_active = TRUE
       ORDER BY s.day_of_week, s.start_time`,
      [studentId]
    );

    // Lịch học trong tuần
    const [schedule] = await db.query(
      `SELECT s.*, c.name as class_name, c.type as class_type
       FROM students st
       JOIN classes c ON c.id = st.class_id
       JOIN schedules s ON s.class_id = c.id AND s.is_active = TRUE
       WHERE st.user_id = ? AND c.is_active = TRUE
       ORDER BY s.day_of_week, s.start_time`,
      [studentId]
    );

    // Điểm số
    const [grades] = await db.query(
      `SELECT g.*, c.name as class_name, c.type as class_type
       FROM grades g
       JOIN classes c ON c.id = g.class_id
       WHERE g.student_id = ?
       ORDER BY g.updated_at DESC`,
      [studentId]
    );

    // Nhận xét gần nhất
    const [recentComments] = await db.query(
      `SELECT sc.*, c.name as class_name, u.full_name as teacher_name
       FROM session_comments sc
       JOIN classes c ON c.id = sc.class_id
       JOIN users u ON u.id = sc.teacher_id
       WHERE sc.student_id = ?
       ORDER BY sc.session_date DESC
       LIMIT 3`,
      [studentId]
    );

    // Thống kê điểm danh
    const [[attendance]] = await db.query(
      `SELECT
         COALESCE(SUM(class_totals.total_sessions), 0) as total_sessions,
         COALESCE(SUM(class_totals.present_count), 0) as present_count,
         COALESCE(SUM(class_totals.absent_count), 0) as absent_count,
         COALESCE(SUM(class_totals.late_count), 0) as late_count
       FROM (
         SELECT
           c.id,
           COALESCE(c.total_sessions, 0) as total_sessions,
           COUNT(DISTINCT CASE
             WHEN sc.attendance = 'present'
             THEN sc.session_date
           END) as present_count,
           COUNT(DISTINCT CASE
             WHEN sc.attendance = 'absent'
             THEN sc.session_date
           END) as absent_count,
           COUNT(DISTINCT CASE
             WHEN sc.attendance = 'late'
             THEN sc.session_date
           END) as late_count
         FROM students st
         JOIN classes c ON c.id = st.class_id AND c.is_active = TRUE
         LEFT JOIN session_comments sc
           ON sc.class_id = c.id
          AND sc.student_id = st.user_id
         WHERE st.user_id = ?
       GROUP BY c.id, c.total_sessions
       ) class_totals`,
      [studentId]
    );

    res.json({ success: true, myClasses, schedule, grades, recentComments, attendance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

router.get('/availability', studentOnly, async (req, res) => {
  try {
    await ensureAvailabilityTable();
    const [slots] = await db.query(
      `SELECT day_of_week, TIME_FORMAT(start_time, '%H:%i') as start_time, TIME_FORMAT(end_time, '%H:%i') as end_time
       FROM availability_requests
       WHERE user_id=? AND role='student'
       ORDER BY day_of_week, start_time`,
      [req.user.id]
    );
    res.json({ success: true, slots });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Loi server' });
  }
});

router.post('/availability', studentOnly, async (req, res) => {
  const slots = normalizeAvailabilitySlots(req.body.slots);
  const note = req.body.note;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await ensureAvailabilityTable(conn);
    await conn.query("DELETE FROM availability_requests WHERE user_id=? AND role='student'", [req.user.id]);
    if (slots.length > 0) {
      await conn.query(
        'INSERT INTO availability_requests (user_id, role, day_of_week, start_time, end_time) VALUES ?',
        [slots.map(slot => [req.user.id, 'student', slot.day_of_week, slot.start_time, slot.end_time])]
      );
    }
    await notifyAdminsAvailability(conn, { senderId: req.user.id, senderName: req.user.full_name, slots, note });
    await conn.commit();
    res.json({ success: true, message: 'Đã lưu lịch học đăng ký', slots });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Loi server' });
  } finally {
    conn.release();
  }
});

// ===================== LỚP HỌC =====================
router.get('/teachers', studentOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, username, full_name, email, is_active, created_at FROM users WHERE role='teacher' AND is_active=TRUE ORDER BY full_name"
    );
    const teacherIds = rows.map(row => row.id);
    let schedulesByTeacher = {};

    if (teacherIds.length > 0) {
      const [scheduleRows] = await db.query(
        `SELECT s.id, s.class_id, s.teacher_id, s.day_of_week, s.start_time, s.end_time, c.name as class_name
         FROM schedules s
         JOIN classes c ON c.id = s.class_id AND c.is_active = TRUE
         WHERE s.is_active = TRUE AND s.teacher_id IN (?)
         ORDER BY s.day_of_week, s.start_time`,
        [teacherIds]
      );

      schedulesByTeacher = scheduleRows.reduce((acc, schedule) => {
        if (!acc[schedule.teacher_id]) acc[schedule.teacher_id] = [];
        acc[schedule.teacher_id].push(schedule);
        return acc;
      }, {});
    }

    rows.forEach(row => {
      row.schedules = schedulesByTeacher[row.id] || [];
    });

    res.json({ success: true, teachers: await attachTeacherAvailability(rows) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Loi server' });
  }
});

router.get('/available-classes', studentOnly, async (req, res) => {
  try {
    const [[{ registered_count }]] = await db.query(
      `SELECT COUNT(*) as registered_count
       FROM students st
       JOIN classes c ON c.id = st.class_id AND c.is_active = TRUE AND c.type = 'vip'
       WHERE st.user_id = ?`,
      [req.user.id]
    );

    const [rows] = await db.query(
      `SELECT c.id, c.name, c.type, c.max_students, c.total_sessions, u.full_name as teacher_name,
              COUNT(DISTINCT st.user_id) as student_count,
              (SELECT COUNT(DISTINCT sc.session_date) FROM session_comments sc WHERE sc.class_id = c.id) as session_count,
              EXISTS (
                SELECT 1 FROM students mine
                WHERE mine.class_id = c.id AND mine.user_id = ?
              ) as is_registered
       FROM classes c
       LEFT JOIN users u ON u.id = c.teacher_id
       LEFT JOIN students st ON st.class_id = c.id
       WHERE c.is_active = TRUE AND c.type = 'vip'
       GROUP BY c.id, c.name, c.type, c.max_students, c.total_sessions, u.full_name
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    const classIds = rows.map(row => row.id);
    let schedulesByClass = {};
    if (classIds.length > 0) {
      const [scheduleRows] = await db.query(
        `SELECT class_id, day_of_week, TIME_FORMAT(start_time, '%H:%i') as start_time, TIME_FORMAT(end_time, '%H:%i') as end_time
         FROM schedules
         WHERE is_active = TRUE AND class_id IN (?)
         ORDER BY day_of_week, start_time`,
        [classIds]
      );
      schedulesByClass = scheduleRows.reduce((acc, schedule) => {
        if (!acc[schedule.class_id]) acc[schedule.class_id] = [];
        acc[schedule.class_id].push(schedule);
        return acc;
      }, {});
    }

    rows.forEach(row => {
      row.schedules = schedulesByClass[row.id] || [];
      row.is_full = Number(row.student_count || 0) >= Number(row.max_students || 30);
    });

    res.json({ success: true, classes: rows, has_registered_class: registered_count > 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Loi server' });
  }
});

router.post('/classes/:id/register', studentOnly, async (req, res) => {
  const classId = req.params.id;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[cls]] = await conn.query(
      `SELECT c.id, c.name, c.max_students, u.full_name as teacher_name
       FROM classes c
       LEFT JOIN users u ON u.id = c.teacher_id
       WHERE c.id=? AND c.type='vip' AND c.is_active=TRUE
       FOR UPDATE`,
      [classId]
    );
    if (!cls) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Lop khong ton tai' });
    }

    const [[existing]] = await conn.query(
      'SELECT COUNT(*) as count FROM students WHERE class_id=? AND user_id=?',
      [classId, req.user.id]
    );
    if (existing.count > 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Ban da dang ky lop nay' });
    }

    const [[registered]] = await conn.query(
      `SELECT COUNT(*) as count
       FROM students st
       JOIN classes c ON c.id = st.class_id AND c.is_active = TRUE AND c.type = 'vip'
       WHERE st.user_id=?`,
      [req.user.id]
    );
    if (registered.count > 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Ban chi duoc dang ky 1 lop' });
    }

    const [[{ cur }]] = await conn.query(
      'SELECT COUNT(DISTINCT user_id) as cur FROM students WHERE class_id=?',
      [classId]
    );
    if (cur >= (cls.max_students || 30)) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Lop da du si so' });
    }

    await conn.query(
      'INSERT INTO students (user_id, class_id, enrollment_date) VALUES (?, ?, ?)',
      [req.user.id, classId, new Date().toISOString().slice(0, 10)]
    );

    const [schedules] = await conn.query(
      `SELECT day_of_week, TIME_FORMAT(start_time, '%H:%i') as start_time, TIME_FORMAT(end_time, '%H:%i') as end_time
       FROM schedules
       WHERE class_id=? AND is_active=TRUE
       ORDER BY day_of_week, start_time`,
      [classId]
    );

    await notifyAdminsClassRegistration(conn, {
      senderId: req.user.id,
      senderName: req.user.full_name,
      className: cls.name,
      schedules,
      teacherName: cls.teacher_name,
    });

    await conn.commit();
    res.json({ success: true, message: 'Da dang ky lop thanh cong' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Ban da dang ky lop nay' });
    }
    res.status(500).json({ success: false, message: 'Loi server' });
  } finally {
    conn.release();
  }
});

router.delete('/classes/:id/register', studentOnly, async (req, res) => {
  const classId = req.params.id;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[cls]] = await conn.query(
      `SELECT id, name
       FROM classes
       WHERE id=? AND type='vip' AND is_active=TRUE`,
      [classId]
    );
    if (!cls) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Lop khong ton tai' });
    }

    const [result] = await conn.query(
      'DELETE FROM students WHERE class_id=? AND user_id=?',
      [classId, req.user.id]
    );
    if (result.affectedRows === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Ban chua dang ky lop nay' });
    }

    await notifyAdminsClassCancellation(conn, {
      senderId: req.user.id,
      senderName: req.user.full_name,
      className: cls.name,
    });

    await conn.commit();
    res.json({ success: true, message: 'Da huy dang ky lop' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Loi server' });
  } finally {
    conn.release();
  }
});

router.get('/my-classes', studentOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, s.day_of_week, s.start_time, s.end_time, s.id as schedule_id,
              u.full_name as teacher_name, st.enrollment_date,
              (SELECT COUNT(DISTINCT sc.session_date) FROM session_comments sc WHERE sc.class_id = c.id) as class_session_count,
              (SELECT COUNT(*) FROM session_comments sc WHERE sc.class_id = c.id AND sc.student_id = st.user_id) as recorded_sessions,
              (SELECT COUNT(*) FROM session_comments sc WHERE sc.class_id = c.id AND sc.student_id = st.user_id AND sc.attendance IN ('present','late')) as learned_sessions,
              (SELECT COUNT(*) FROM session_comments sc WHERE sc.class_id = c.id AND sc.student_id = st.user_id AND sc.attendance = 'absent') as absent_sessions
       FROM students st
       JOIN classes c ON c.id = st.class_id
       JOIN schedules s ON s.class_id = c.id AND s.is_active = TRUE
       JOIN users u ON u.id = s.teacher_id
       WHERE st.user_id = ? AND c.is_active = TRUE
       ORDER BY c.type, s.day_of_week`,
      [req.user.id]
    );
    res.json({ success: true, classes: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ===================== THỜI KHÓA BIỂU =====================
router.get('/schedule', studentOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT s.*, c.name as class_name, c.type as class_type,
              u.full_name as teacher_name
       FROM students st
       JOIN classes c ON c.id = st.class_id
       JOIN schedules s ON s.class_id = c.id AND s.is_active = TRUE
       JOIN users u ON u.id = s.teacher_id
       WHERE st.user_id = ? AND c.is_active = TRUE
       ORDER BY s.day_of_week, s.start_time`,
      [req.user.id]
    );
    res.json({ success: true, schedule: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ===================== BẢNG ĐIỂM =====================
router.get('/grades', studentOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT g.*, c.name as class_name, c.type as class_type,
              u.full_name as teacher_name
       FROM grades g
       JOIN classes c ON c.id = g.class_id
       LEFT JOIN users u ON u.id = g.created_by
       WHERE g.student_id = ?
       ORDER BY g.semester DESC, g.updated_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, grades: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ===================== NHẬN XÉT TỪNG BUỔI =====================
router.get('/comments', studentOnly, async (req, res) => {
  const { class_id } = req.query;
  try {
    let query = `
      SELECT sc.*, c.name as class_name, u.full_name as teacher_name
      FROM session_comments sc
      JOIN classes c ON c.id = sc.class_id
      JOIN users u ON u.id = sc.teacher_id
      WHERE sc.student_id = ?`;
    const params = [req.user.id];

    if (class_id) { query += ' AND sc.class_id = ?'; params.push(class_id); }
    query += ' ORDER BY sc.session_date DESC LIMIT 50';

    const [rows] = await db.query(query, params);
    res.json({ success: true, comments: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ===================== THÔNG BÁO =====================
router.get('/notifications', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT n.*, u.full_name as sender_name
       FROM notifications n
       LEFT JOIN users u ON u.id = n.sender_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const [[{ unread }]] = await db.query(
      'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ success: true, notifications: rows, unread });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

router.put('/notifications/read-all', async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
    res.json({ success: true });
  } catch { res.status(500).json({ success: false }); }
});

module.exports = router;
