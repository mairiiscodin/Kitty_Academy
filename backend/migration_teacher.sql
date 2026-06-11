-- =============================================
-- Migration: Thêm các bảng cho chức năng giáo viên
-- Chạy: mysql -u root -p kitty_academy < migration_teacher.sql
-- =============================================

USE kitty_academy;

-- Bảng lịch dạy (schedule của từng lớp)
CREATE TABLE IF NOT EXISTS schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  teacher_id INT NOT NULL,
  day_of_week TINYINT NOT NULL COMMENT '0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng yêu cầu hủy/chuyển nhượng lớp
CREATE TABLE IF NOT EXISTS cancel_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  schedule_id INT NOT NULL,
  requesting_teacher_id INT NOT NULL COMMENT 'GV xin hủy',
  substitute_teacher_id INT COMMENT 'GV được nhờ thay',
  reason TEXT,
  status ENUM('pending', 'accepted', 'rejected', 'cancelled') DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
  FOREIGN KEY (requesting_teacher_id) REFERENCES users(id),
  FOREIGN KEY (substitute_teacher_id) REFERENCES users(id)
);

-- Bảng thông báo
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT 'Người nhận',
  sender_id INT COMMENT 'Người gửi',
  type ENUM('cancel_request', 'request_accepted', 'request_rejected', 'system') DEFAULT 'system',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  cancel_request_id INT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (cancel_request_id) REFERENCES cancel_requests(id) ON DELETE SET NULL
);

-- Bảng theo dõi trạng thái online
CREATE TABLE IF NOT EXISTS user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_online BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- Thêm teacher_id vào bảng classes nếu chưa có
-- =============================================
ALTER TABLE classes MODIFY COLUMN teacher_id INT;

-- Gán giáo viên mẫu cho các lớp
UPDATE classes SET teacher_id = (SELECT id FROM users WHERE username = 'teacher01') WHERE id IN (1, 2);
UPDATE classes SET teacher_id = (SELECT id FROM users WHERE username = 'teacher02') WHERE id IN (3, 4);

-- =============================================
-- Dữ liệu lịch dạy mẫu
-- =============================================
INSERT INTO schedules (class_id, teacher_id, day_of_week, start_time, end_time) VALUES
-- teacher01 dạy lớp 1: Mon + Fri 18:00-18:45
(1, (SELECT id FROM users WHERE username='teacher01'), 1, '18:00:00', '18:45:00'),
(1, (SELECT id FROM users WHERE username='teacher01'), 5, '18:00:00', '18:45:00'),
-- teacher01 dạy lớp 2: Wed 19:30-20:15  
(2, (SELECT id FROM users WHERE username='teacher01'), 3, '19:30:00', '20:15:00'),
-- teacher02 dạy lớp 3: Tue 18:45-19:30
(3, (SELECT id FROM users WHERE username='teacher02'), 2, '18:45:00', '19:30:00'),
-- teacher02 dạy lớp 4: Thu 20:15-21:00
(4, (SELECT id FROM users WHERE username='teacher02'), 4, '20:15:00', '21:00:00');

SELECT 'Migration completed!' AS message;
