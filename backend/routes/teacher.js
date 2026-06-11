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
              COUNT(st.id) as student_count
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
              COUNT(DISTINCT st.id) as student_count
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
              COUNT(DISTINCT st.id) as student_count
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
router.post('/cancel-request', teacherOnly, async (req, res) => {
  const { schedule_id, substitute_teacher_id, reason } = req.body;
  if (!schedule_id || !substitute_teacher_id) {
    return res.status(400).json({ success: false, message: 'Thiếu thông tin' });
  }

  try {
    // Kiểm tra schedule thuộc về GV này
    const [schedRows] = await db.query(
      `SELECT s.*, c.name as class_name, c.type as class_type
       FROM schedules s JOIN classes c ON c.id = s.class_id
       WHERE s.id = ? AND s.teacher_id = ?`,
      [schedule_id, req.user.id]
    );
    if (schedRows.length === 0) {
      return res.status(403).json({ success: false, message: 'Không tìm thấy lịch dạy' });
    }

    // Kiểm tra đã có yêu cầu pending chưa
    const [existing] = await db.query(
      "SELECT id FROM cancel_requests WHERE schedule_id = ? AND status = 'pending'",
      [schedule_id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Đã có yêu cầu đang chờ xử lý cho lịch này' });
    }

    const sched = schedRows[0];

    // Tạo cancel_request
    const [result] = await db.query(
      'INSERT INTO cancel_requests (schedule_id, requesting_teacher_id, substitute_teacher_id, reason) VALUES (?, ?, ?, ?)',
      [schedule_id, req.user.id, substitute_teacher_id, reason || null]
    );

    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayStr = days[sched.day_of_week];
    const timeStr = `${sched.start_time.substring(0,5)}-${sched.end_time.substring(0,5)}`;

    // Gửi thông báo cho GV được nhờ
    await db.query(
      `INSERT INTO notifications (user_id, sender_id, type, title, message, cancel_request_id)
       VALUES (?, ?, 'cancel_request', ?, ?, ?)`,
      [
        substitute_teacher_id,
        req.user.id,
        `Yêu cầu dạy thay lớp ${sched.class_name}`,
        `${req.user.full_name} nhờ bạn dạy thay lớp "${sched.class_name}" (${dayStr} ${timeStr}). Lý do: ${reason || 'Không có lý do'}`,
        result.insertId
      ]
    );

    res.json({ success: true, message: 'Đã gửi yêu cầu thành công', request_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// Xác nhận / từ chối yêu cầu dạy thay
router.post('/cancel-request/:id/respond', teacherOnly, async (req, res) => {
  const { action } = req.body; // 'accept' | 'reject'
  const requestId = req.params.id;

  if (!['accept', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Action không hợp lệ' });
  }

  try {
    const [rows] = await db.query(
      `SELECT cr.*, s.class_id, s.teacher_id as original_teacher_id,
              c.name as class_name, s.day_of_week, s.start_time, s.end_time
       FROM cancel_requests cr
       JOIN schedules s ON s.id = cr.schedule_id
       JOIN classes c ON c.id = s.class_id
       WHERE cr.id = ? AND cr.substitute_teacher_id = ? AND cr.status = 'pending'`,
      [requestId, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Yêu cầu không tồn tại hoặc không hợp lệ' });
    }

    const req_data = rows[0];
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayStr = days[req_data.day_of_week];
    const timeStr = `${req_data.start_time.substring(0,5)}-${req_data.end_time.substring(0,5)}`;

    if (action === 'accept') {
      // Cập nhật teacher_id trong schedules → chuyển nhượng lịch
      await db.query(
        'UPDATE schedules SET teacher_id = ? WHERE id = ?',
        [req.user.id, req_data.schedule_id]
      );
      // Cập nhật teacher_id trong classes nếu cần
      await db.query(
        'UPDATE classes SET teacher_id = ? WHERE id = ? AND teacher_id = ?',
        [req.user.id, req_data.class_id, req_data.original_teacher_id]
      );
      // Cập nhật trạng thái yêu cầu
      await db.query(
        "UPDATE cancel_requests SET status = 'accepted', responded_at = NOW() WHERE id = ?",
        [requestId]
      );
      // Thông báo cho GV xin hủy
      await db.query(
        `INSERT INTO notifications (user_id, sender_id, type, title, message, cancel_request_id)
         VALUES (?, ?, 'request_accepted', ?, ?, ?)`,
        [
          req_data.requesting_teacher_id,
          req.user.id,
          `✅ Yêu cầu được chấp nhận`,
          `${req.user.full_name} đã đồng ý dạy thay lớp "${req_data.class_name}" (${dayStr} ${timeStr}). Lịch dạy đã được chuyển nhượng.`,
          requestId
        ]
      );
      res.json({ success: true, message: 'Đã chấp nhận dạy thay. Lịch đã được chuyển nhượng!' });

    } else {
      await db.query(
        "UPDATE cancel_requests SET status = 'rejected', responded_at = NOW() WHERE id = ?",
        [requestId]
      );
      await db.query(
        `INSERT INTO notifications (user_id, sender_id, type, title, message, cancel_request_id)
         VALUES (?, ?, 'request_rejected', ?, ?, ?)`,
        [
          req_data.requesting_teacher_id,
          req.user.id,
          `❌ Yêu cầu bị từ chối`,
          `${req.user.full_name} không thể dạy thay lớp "${req_data.class_name}" (${dayStr} ${timeStr}).`,
          requestId
        ]
      );
      res.json({ success: true, message: 'Đã từ chối yêu cầu' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
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
