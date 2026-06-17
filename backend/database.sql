-- =============================================
-- Kitty Academy Database Setup
-- Chạy file này trong MySQL Workbench hoặc CLI:
-- mysql -u root -p < database.sql
-- =============================================

CREATE DATABASE IF NOT EXISTS kitty_academy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kitty_academy;

-- Bảng users (tài khoản đăng nhập)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  role ENUM('admin', 'teacher', 'student', 'admission') DEFAULT 'student',
  email VARCHAR(200),
  avatar VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Bảng classes (lớp học)
CREATE TABLE IF NOT EXISTS classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  type ENUM('vip', 'trial') NOT NULL DEFAULT 'trial',
  teacher_id INT,
  description TEXT,
  trial_student_name VARCHAR(200),
  max_students INT DEFAULT 30,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng teachers (giáo viên)
CREATE TABLE IF NOT EXISTS teachers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subject VARCHAR(200),
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bảng students (học viên)
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  class_id INT,
  enrollment_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
);

-- =============================================
-- Dữ liệu mẫu
-- =============================================

-- Tài khoản admin mặc định
-- username: admin | password: Admin@123
INSERT INTO users (username, password, full_name, role, email) VALUES
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Lê Ngọc Anh', 'admin', 'admin@kittyacademy.com');

-- Lưu ý: password hash trên là "password" - bạn hãy đổi ngay sau khi setup!
-- Để tạo hash mới, dùng bcrypt với salt rounds = 10

-- Dữ liệu mẫu giáo viên
INSERT INTO users (username, password, full_name, role, email) VALUES
('teacher01', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Nguyễn Thị Mai', 'teacher', 'mai@kittyacademy.com'),
('teacher02', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Trần Văn Hùng', 'teacher', 'hung@kittyacademy.com');

-- Dữ liệu mẫu học viên
INSERT INTO users (username, password, full_name, role, email) VALUES
('student01', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Phạm Thị Lan', 'student', 'lan@gmail.com'),
('student02', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.', 'Hoàng Minh Tuấn', 'student', 'tuan@gmail.com');

-- Lớp học mẫu
INSERT INTO classes (name, type, description) VALUES
('Tiếng Anh VIP - Cơ bản', 'vip', 'Lớp học tiếng Anh VIP dành cho người mới bắt đầu'),
('Tiếng Anh VIP - Nâng cao', 'vip', 'Lớp học tiếng Anh VIP nâng cao'),
('Lớp Trải nghiệm - Buổi 1', 'trial', 'Lớp học thử miễn phí buổi 1'),
('Lớp Trải nghiệm - Cuối tuần', 'trial', 'Lớp học thử cuối tuần');

SELECT 'Database setup completed!' AS message;
SELECT 'Admin login: username=admin, password=password' AS info;
