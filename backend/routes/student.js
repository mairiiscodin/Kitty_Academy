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

const notifyAdminsAvailability = async (conn, { senderId, senderName, slots }) => {
  const [admins] = await conn.query("SELECT id FROM users WHERE role='admin' AND is_active=TRUE");
  if (admins.length === 0) return;
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const slotText = slots.map(slot => `${days[slot.day_of_week]} ${slot.start_time}-${slot.end_time}`).join(', ');
  const rows = admins.map(admin => [
    admin.id,
    senderId,
    'system',
    'Học sinh đăng ký lịch học',
    `${senderName} đã đăng ký lịch học: ${slotText || 'chưa chọn khung giờ'}. Admin có thể tạo lớp từ thông báo này hoặc vào giao diện thêm lớp để chọn giờ, giáo viên và học sinh phù hợp.`,
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
  if (slots.length > 2) {
    return res.status(400).json({ success: false, message: 'Học sinh chỉ được đăng ký tối đa 2 buổi/tuần' });
  }
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
    await notifyAdminsAvailability(conn, { senderId: req.user.id, senderName: req.user.full_name, slots });
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
