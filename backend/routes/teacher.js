const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// Tất cả routes cần đăng nhập
router.use(authMiddleware);

// Helper: chỉ giáo viên hoặc admin
const teacherOnly = (req, res, next) => {
  if (!['teacher', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Chỉ giáo viên mới có quyền truy cập' });
  }
  next();
};

const isDateString = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '');

const classStudentCountSql = `
  CASE
    WHEN c.type = 'trial' AND NULLIF(TRIM(c.trial_student_name), '') IS NOT NULL THEN 1
    ELSE COUNT(DISTINCT st.id)
  END as student_count
`;

const getTeacherClass = async (conn, classId, teacherId) => {
  const [rows] = await conn.query(
    `SELECT c.id, c.name, c.type, s.day_of_week, s.start_time, s.end_time, s.id as schedule_id,
            (SELECT COUNT(DISTINCT sc.session_date) FROM session_comments sc WHERE sc.class_id = c.id) as session_count,
            ${classStudentCountSql}
     FROM classes c
     JOIN schedules s ON s.class_id = c.id AND s.teacher_id = ? AND s.is_active = TRUE
     LEFT JOIN students st ON st.class_id = c.id
     WHERE c.id = ? AND c.is_active = TRUE
     GROUP BY c.id, s.id
     LIMIT 1`,
    [teacherId, classId]
  );
  return rows[0];
};

// ===================== ONLINE STATUS =====================

// Cập nhật trạng thái online (gọi mỗi 30s từ FE)
router.post('/ping', async (req, res) => {
  try {
    await db.query(
      `INSERT INTO user_sessions (user_id, is_online, last_seen) VALUES (?, TRUE, NOW())
       ON DUPLICATE KEY UPDATE is_online = TRUE, last_seen = NOW()`,
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Đánh dấu offline khi logout
router.post('/offline', async (req, res) => {
  try {
    await db.query(
      'UPDATE user_sessions SET is_online = FALSE WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ===================== DASHBOARD GIÁO VIÊN =====================

router.get('/dashboard', teacherOnly, async (req, res) => {
  const teacherId = req.user.id;
  try {
    // Lớp của giáo viên
    const [myClasses] = await db.query(
      `SELECT c.*, s.day_of_week, s.start_time, s.end_time, s.id as schedule_id,
              (SELECT COUNT(DISTINCT sc.session_date) FROM session_comments sc WHERE sc.class_id = c.id) as session_count,
              ${classStudentCountSql}
       FROM classes c
       JOIN schedules s ON s.class_id = c.id AND s.teacher_id = ? AND s.is_active = TRUE
       LEFT JOIN students st ON st.class_id = c.id
       WHERE c.is_active = TRUE
       GROUP BY c.id, s.id
       ORDER BY s.day_of_week, s.start_time`,
      [teacherId]
    );

    // Lịch trong tuần (cho thời khóa biểu)
    const [schedule] = await db.query(
      `SELECT s.*, c.name as class_name, c.type as class_type
       FROM schedules s
       JOIN classes c ON c.id = s.class_id
       WHERE s.teacher_id = ? AND s.is_active = TRUE AND c.is_active = TRUE
       ORDER BY s.day_of_week, s.start_time`,
      [teacherId]
    );

    // Thống kê
    const [[{ total_vip }]] = await db.query(
      "SELECT COUNT(DISTINCT c.id) as total_vip FROM classes c JOIN schedules s ON s.class_id=c.id WHERE s.teacher_id=? AND c.type='vip' AND c.is_active=TRUE AND s.is_active=TRUE",
      [teacherId]
    );
    const [[{ total_trial }]] = await db.query(
      "SELECT COUNT(DISTINCT c.id) as total_trial FROM classes c JOIN schedules s ON s.class_id=c.id WHERE s.teacher_id=? AND c.type='trial' AND c.is_active=TRUE AND s.is_active=TRUE",
      [teacherId]
    );
    const [[{ unread_noti }]] = await db.query(
      'SELECT COUNT(*) as unread_noti FROM notifications WHERE user_id=? AND is_read=FALSE',
      [teacherId]
    );

    res.json({ success: true, myClasses, schedule, stats: { total_vip, total_trial, unread_noti } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ===================== LỚP HỌC =====================

// Lớp VIP của giáo viên
router.get('/classes/vip', teacherOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, s.day_of_week, s.start_time, s.end_time, s.id as schedule_id,
              (SELECT COUNT(DISTINCT sc.session_date) FROM session_comments sc WHERE sc.class_id = c.id) as session_count,
              ${classStudentCountSql}
       FROM classes c
       JOIN schedules s ON s.class_id = c.id AND s.teacher_id = ? AND s.is_active = TRUE
       LEFT JOIN students st ON st.class_id = c.id
       WHERE c.type = 'vip' AND c.is_active = TRUE
       GROUP BY c.id, s.id
       ORDER BY s.day_of_week, s.start_time`,
      [req.user.id]
    );
    res.json({ success: true, classes: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Lớp Trải nghiệm của giáo viên
router.get('/classes/trial', teacherOnly, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.*, s.day_of_week, s.start_time, s.end_time, s.id as schedule_id,
              (SELECT COUNT(DISTINCT sc.session_date) FROM session_comments sc WHERE sc.class_id = c.id) as session_count,
              ${classStudentCountSql}
       FROM classes c
       JOIN schedules s ON s.class_id = c.id AND s.teacher_id = ? AND s.is_active = TRUE
       LEFT JOIN students st ON st.class_id = c.id
       WHERE c.type = 'trial' AND c.is_active = TRUE
       GROUP BY c.id, s.id
       ORDER BY s.day_of_week, s.start_time`,
      [req.user.id]
    );
    res.json({ success: true, classes: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Danh sách học viên để giáo viên điểm danh
router.get('/classes/:id/students', teacherOnly, async (req, res) => {
  const classId = req.params.id;
  const sessionDate = req.query.date || new Date().toISOString().slice(0, 10);

  if (!isDateString(sessionDate)) {
    return res.status(400).json({ success: false, message: 'Ngày điểm danh không hợp lệ' });
  }

  try {
    const teacherClass = await getTeacherClass(db, classId, req.user.id);
    if (!teacherClass) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    const [students] = await db.query(
      `SELECT u.id, u.username, u.full_name, u.email,
              COALESCE(sc.attendance, 'present') as attendance,
              COALESCE(sc.homework_done, TRUE) as homework_done,
              sc.comment
       FROM students st
       JOIN users u ON u.id = st.user_id
       LEFT JOIN session_comments sc
         ON sc.student_id = u.id AND sc.class_id = st.class_id AND sc.session_date = ?
       WHERE st.class_id = ? AND u.is_active = TRUE
       ORDER BY u.full_name`,
      [sessionDate, classId]
    );

    res.json({ success: true, class: teacherClass, students, session_date: sessionDate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Lưu điểm danh từng buổi học
router.post('/classes/:id/attendance', teacherOnly, async (req, res) => {
  const classId = req.params.id;
  const { session_date, records } = req.body;
  const validAttendance = new Set(['present', 'absent', 'late']);

  if (!isDateString(session_date)) {
    return res.status(400).json({ success: false, message: 'Ngày điểm danh không hợp lệ' });
  }
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, message: 'Chưa có học viên nào để điểm danh' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const teacherClass = await getTeacherClass(conn, classId, req.user.id);
    if (!teacherClass) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Không tìm thấy lớp học' });
    }

    const [enrolled] = await conn.query(
      'SELECT user_id FROM students WHERE class_id = ?',
      [classId]
    );
    const enrolledIds = new Set(enrolled.map(row => Number(row.user_id)));

    const normalized = records.map(record => ({
      student_id: Number(record.student_id),
      attendance: validAttendance.has(record.attendance) ? record.attendance : 'present',
      comment: record.comment?.trim() || null,
      homework_done: record.homework_done === undefined ? true : Boolean(record.homework_done),
    }));

    const invalid = normalized.find(record => !enrolledIds.has(record.student_id));
    if (invalid) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Danh sách học viên không hợp lệ' });
    }

    const values = normalized.map(record => [
      record.student_id,
      classId,
      req.user.id,
      session_date,
      record.attendance,
      record.comment,
      record.homework_done,
    ]);

    await conn.query(
      `INSERT INTO session_comments
        (student_id, class_id, teacher_id, session_date, attendance, comment, homework_done)
       VALUES ?
       ON DUPLICATE KEY UPDATE
        teacher_id = VALUES(teacher_id),
        attendance = VALUES(attendance),
        comment = VALUES(comment),
        homework_done = VALUES(homework_done),
        updated_at = CURRENT_TIMESTAMP`,
      [values]
    );

    const [[{ session_count }]] = await conn.query(
      'SELECT COUNT(DISTINCT session_date) as session_count FROM session_comments WHERE class_id = ?',
      [classId]
    );

    await conn.commit();
    res.json({ success: true, message: 'Đã lưu điểm danh', session_count });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  } finally {
    conn.release();
  }
});

// ===================== GIÁO VIÊN ONLINE =====================

router.get('/teachers/online', teacherOnly, async (req, res) => {
  try {
    // Đánh dấu offline nếu last_seen > 60s
    await db.query(
      "UPDATE user_sessions SET is_online = FALSE WHERE last_seen < DATE_SUB(NOW(), INTERVAL 60 SECOND)"
    );

    const [rows] = await db.query(
      `SELECT u.id, u.full_name, u.email, u.username,
              COALESCE(us.is_online, FALSE) as is_online,
              us.last_seen,
              COUNT(DISTINCT s.class_id) as class_count
       FROM users u
       LEFT JOIN user_sessions us ON us.user_id = u.id
       LEFT JOIN schedules s ON s.teacher_id = u.id AND s.is_active = TRUE
       WHERE u.role = 'teacher' AND u.is_active = TRUE AND u.id != ?
       GROUP BY u.id
       ORDER BY is_online DESC, u.full_name`,
      [req.user.id]
    );
    res.json({ success: true, teachers: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ===================== HỦY LỚP / NHỜ GV KHÁC =====================

// Tạo yêu cầu nhờ GV khác dạy thay
router.post('/leave-request', teacherOnly, async (req, res) => {
  const { schedule_id, leave_date, reason } = req.body;
  if (!schedule_id || !reason?.trim()) {
    return res.status(400).json({ success: false, message: 'Vui long nhap ly do nghi' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [schedRows] = await conn.query(
      `SELECT s.*, c.name as class_name, c.type as class_type
       FROM schedules s
       JOIN classes c ON c.id = s.class_id
       WHERE s.id = ? AND s.teacher_id = ? AND s.is_active = TRUE AND c.is_active = TRUE`,
      [schedule_id, req.user.id]
    );

    if (schedRows.length === 0) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Khong tim thay lich day' });
    }

    const sched = schedRows[0];
    const days = ['Chu nhat', 'Thu 2', 'Thu 3', 'Thu 4', 'Thu 5', 'Thu 6', 'Thu 7'];
    const dayStr = days[sched.day_of_week];
    const timeStr = `${sched.start_time.substring(0,5)}-${sched.end_time.substring(0,5)}`;
    const dateStr = leave_date || 'chua chon ngay';
    const cleanReason = reason.trim();

    const [admins] = await conn.query(
      'SELECT id FROM users WHERE role = ? AND is_active = TRUE',
      ['admin']
    );
    const [students] = await conn.query(
      `SELECT u.id
       FROM students st
       JOIN users u ON u.id = st.user_id
       WHERE st.class_id = ? AND u.is_active = TRUE`,
      [sched.class_id]
    );

    const notifications = [];
    admins.forEach(admin => {
      notifications.push([
        admin.id,
        req.user.id,
        'system',
        'Giao vien xin nghi',
        `${req.user.full_name} xin nghi lop "${sched.class_name}" ngay ${dateStr} (${dayStr} ${timeStr}). Ly do: ${cleanReason}`,
      ]);
    });
    students.forEach(student => {
      notifications.push([
        student.id,
        req.user.id,
        'system',
        `Thong bao nghi lop ${sched.class_name}`,
        `Giao vien ${req.user.full_name} xin nghi lop "${sched.class_name}" ngay ${dateStr} (${dayStr} ${timeStr}). Ly do: ${cleanReason}`,
      ]);
    });

    if (notifications.length > 0) {
      await conn.query(
        'INSERT INTO notifications (user_id, sender_id, type, title, message) VALUES ?',
        [notifications]
      );
    }

    await conn.commit();
    res.json({ success: true, message: 'Da gui thong bao xin nghi', notified: notifications.length });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ success: false, message: 'Loi server' });
  } finally {
    conn.release();
  }
});

router.post('/cancel-request', teacherOnly, async (req, res) => {
  return res.status(410).json({ success: false, message: 'Chuc nang day thay da duoc thay bang xin nghi' });
});

router.post('/cancel-request/:id/respond', teacherOnly, async (req, res) => {
  return res.status(410).json({ success: false, message: 'Chuc nang day thay da bi tat' });
});
// ===================== THÔNG BÁO =====================

router.get('/notifications', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT n.*, u.full_name as sender_name,
              cr.status as request_status, cr.schedule_id
       FROM notifications n
       LEFT JOIN users u ON u.id = n.sender_id
       LEFT JOIN cancel_requests cr ON cr.id = n.cancel_request_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 50`,
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

// Đánh dấu đã đọc
router.put('/notifications/read-all', async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

router.put('/notifications/:id/read', async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

module.exports = router;
