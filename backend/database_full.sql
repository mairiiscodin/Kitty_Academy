-- =============================================
-- Kitty Academy Full Database Setup
-- This file consolidates database.sql and all backend migrations.
-- Run:
--   mysql -u root -p < backend/database_full.sql
-- =============================================

CREATE DATABASE IF NOT EXISTS defaultdb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE defaultdb;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS cancel_requests;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS session_records;
DROP TABLE IF EXISTS session_comments;
DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS teachers;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================
-- Core tables
-- =============================================

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  role ENUM('admin', 'teacher', 'student', 'admission') NOT NULL DEFAULT 'student',
  email VARCHAR(200),
  avatar VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role_active (role, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  type ENUM('vip', 'trial') NOT NULL DEFAULT 'trial',
  teacher_id INT NULL,
  description TEXT,
  class_link VARCHAR(500) NULL COMMENT 'Link Meet/Zoom/Teams...',
  trial_student_name VARCHAR(200) NULL,
  max_students INT NOT NULL DEFAULT 30,
  total_sessions INT NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_classes_type_active (type, is_active),
  INDEX idx_classes_teacher (teacher_id),
  CONSTRAINT fk_classes_teacher
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE teachers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  subject VARCHAR(200),
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_teachers_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  class_id INT NULL,
  enrollment_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_students_user_class (user_id, class_id),
  INDEX idx_students_class (class_id),
  CONSTRAINT fk_students_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_students_class
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Teacher schedule and substitution flow
-- =============================================

CREATE TABLE schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  teacher_id INT NOT NULL,
  day_of_week TINYINT NOT NULL COMMENT '0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_schedules_teacher_time (teacher_id, day_of_week, start_time, end_time, is_active),
  INDEX idx_schedules_class_active (class_id, is_active),
  CONSTRAINT fk_schedules_class
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_schedules_teacher
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cancel_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  schedule_id INT NOT NULL,
  requesting_teacher_id INT NOT NULL COMMENT 'Teacher who asks for substitution',
  substitute_teacher_id INT NULL COMMENT 'Teacher asked to substitute',
  reason TEXT,
  status ENUM('pending', 'accepted', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  INDEX idx_cancel_requests_substitute_status (substitute_teacher_id, status),
  INDEX idx_cancel_requests_schedule_status (schedule_id, status),
  CONSTRAINT fk_cancel_requests_schedule
    FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
  CONSTRAINT fk_cancel_requests_requesting_teacher
    FOREIGN KEY (requesting_teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cancel_requests_substitute_teacher
    FOREIGN KEY (substitute_teacher_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT 'Receiver',
  sender_id INT NULL COMMENT 'Sender',
  type ENUM('cancel_request', 'request_accepted', 'request_rejected', 'system') NOT NULL DEFAULT 'system',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  cancel_request_id INT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_user_read_created (user_id, is_read, created_at),
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_sender
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_notifications_cancel_request
    FOREIGN KEY (cancel_request_id) REFERENCES cancel_requests(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_user_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Student progress, grades, and attendance
-- =============================================

CREATE TABLE grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  class_id INT NOT NULL,
  midterm_score DECIMAL(4,1) NULL COMMENT '0-10',
  final_score DECIMAL(4,1) NULL COMMENT '0-10',
  average_score DECIMAL(4,1) NULL,
  semester VARCHAR(50) NOT NULL DEFAULT '2024-2025',
  note TEXT,
  created_by INT NULL COMMENT 'Teacher who entered the grade',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_grades_student_class_semester (student_id, class_id, semester),
  INDEX idx_grades_class (class_id),
  CONSTRAINT fk_grades_student
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_grades_class
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_grades_created_by
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE session_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  class_id INT NOT NULL,
  teacher_id INT NOT NULL,
  session_date DATE NOT NULL,
  attendance ENUM('present', 'absent', 'late') NOT NULL DEFAULT 'present',
  homework_done BOOLEAN NOT NULL DEFAULT TRUE,
  comment TEXT,
  score DECIMAL(5,2) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_session_comments_student_class_date (student_id, class_id, session_date),
  INDEX idx_session_comments_class_date (class_id, session_date),
  CONSTRAINT fk_session_comments_student
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_session_comments_class
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_session_comments_teacher
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE session_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  session_number INT NOT NULL,
  session_date DATE,
  topic VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_session_records_class_number (class_id, session_number),
  CONSTRAINT fk_session_records_class
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Seed data
-- Password hash below is bcrypt for "password".
-- =============================================

INSERT INTO users (username, password, full_name, role, email) VALUES
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Le Ngoc Anh', 'admin', 'admin@kittyacademy.com'),
('admission01', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Tu Van Tuyen Sinh', 'admission', 'admission@kittyacademy.com'),
('teacher01', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Nguyen Thi Mai', 'teacher', 'mai@kittyacademy.com'),
('teacher02', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Tran Van Hung', 'teacher', 'hung@kittyacademy.com'),
('student01', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Pham Thi Lan', 'student', 'lan@gmail.com'),
('student02', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Hoang Minh Tuan', 'student', 'tuan@gmail.com'),
('student03', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Do Minh Anh', 'student', 'minhanh@gmail.com');

INSERT INTO teachers (user_id, subject, bio) VALUES
((SELECT id FROM users WHERE username = 'teacher01'), 'English', 'VIP and trial classes'),
((SELECT id FROM users WHERE username = 'teacher02'), 'English', 'VIP and trial classes');

INSERT INTO classes
  (name, type, teacher_id, description, class_link, trial_student_name, max_students, total_sessions)
VALUES
  ('Tieng Anh VIP - Co ban', 'vip', (SELECT id FROM users WHERE username = 'teacher01'),
   'Lop hoc tieng Anh VIP danh cho nguoi moi bat dau', 'https://meet.google.com/vip-basic', NULL, 30, 10),
  ('Tieng Anh VIP - Nang cao', 'vip', (SELECT id FROM users WHERE username = 'teacher01'),
   'Lop hoc tieng Anh VIP nang cao', 'https://meet.google.com/vip-advanced', NULL, 30, 12),
  ('Lop Trai nghiem - Buoi 1', 'trial', (SELECT id FROM users WHERE username = 'teacher02'),
   'Lop hoc thu mien phi buoi 1', 'https://meet.google.com/trial-1', 'Hoc sinh hoc thu 1', 1, 1),
  ('Lop Trai nghiem - Cuoi tuan', 'trial', (SELECT id FROM users WHERE username = 'teacher02'),
   'Lop hoc thu cuoi tuan', 'https://meet.google.com/trial-weekend', 'Hoc sinh hoc thu 2', 1, 1);

INSERT INTO students (user_id, class_id, enrollment_date) VALUES
((SELECT id FROM users WHERE username = 'student01'), 1, CURDATE()),
((SELECT id FROM users WHERE username = 'student02'), 1, CURDATE()),
((SELECT id FROM users WHERE username = 'student03'), 2, CURDATE());

INSERT INTO schedules (class_id, teacher_id, day_of_week, start_time, end_time) VALUES
(1, (SELECT id FROM users WHERE username = 'teacher01'), 1, '18:00:00', '18:45:00'),
(1, (SELECT id FROM users WHERE username = 'teacher01'), 5, '18:00:00', '18:45:00'),
(2, (SELECT id FROM users WHERE username = 'teacher01'), 3, '19:30:00', '20:15:00'),
(3, (SELECT id FROM users WHERE username = 'teacher02'), 2, '18:45:00', '19:30:00'),
(4, (SELECT id FROM users WHERE username = 'teacher02'), 4, '20:15:00', '21:00:00');

INSERT INTO grades (student_id, class_id, midterm_score, final_score, average_score, semester, created_by) VALUES
((SELECT id FROM users WHERE username = 'student01'), 1, 7.5, 8.0, 7.8, '2024-2025', (SELECT id FROM users WHERE username = 'teacher01')),
((SELECT id FROM users WHERE username = 'student02'), 1, 6.0, 7.0, 6.5, '2024-2025', (SELECT id FROM users WHERE username = 'teacher01')),
((SELECT id FROM users WHERE username = 'student03'), 2, 8.5, 9.0, 8.8, '2024-2025', (SELECT id FROM users WHERE username = 'teacher01'));

INSERT INTO session_comments
  (student_id, class_id, teacher_id, session_date, attendance, homework_done, comment)
VALUES
  ((SELECT id FROM users WHERE username = 'student01'), 1, (SELECT id FROM users WHERE username = 'teacher01'),
   DATE_SUB(CURDATE(), INTERVAL 14 DAY), 'present', TRUE, 'Hoc sinh tich cuc phat bieu, nam bai tot.'),
  ((SELECT id FROM users WHERE username = 'student01'), 1, (SELECT id FROM users WHERE username = 'teacher01'),
   DATE_SUB(CURDATE(), INTERVAL 7 DAY), 'present', TRUE, 'Tien bo ro ret trong ky nang nghe.'),
  ((SELECT id FROM users WHERE username = 'student01'), 1, (SELECT id FROM users WHERE username = 'teacher01'),
   DATE_SUB(CURDATE(), INTERVAL 3 DAY), 'late', TRUE, 'Den muon 10 phut, hoc luc on dinh.'),
  ((SELECT id FROM users WHERE username = 'student02'), 1, (SELECT id FROM users WHERE username = 'teacher01'),
   DATE_SUB(CURDATE(), INTERVAL 7 DAY), 'present', TRUE, 'Hoan thanh bai tap tren lop.');

SELECT 'Kitty Academy full database setup completed!' AS message;
SELECT 'Default login password for seed users: password' AS info;
