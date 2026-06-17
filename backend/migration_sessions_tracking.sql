-- =============================================
-- Migration: Add session tracking features
-- Cập nhật bảng classes thêm tổng số buổi
-- =============================================

-- Thêm cột total_sessions vào classes
ALTER TABLE classes 
ADD COLUMN total_sessions INT DEFAULT 10 AFTER max_students;

-- Nếu bảng session_comments chưa có các cột cần thiết, cập nhật
-- (Giả sử table này đã tồn tại từ trước)
-- Nếu chưa, tạo table:
CREATE TABLE IF NOT EXISTS session_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  session_date DATE NOT NULL,
  student_id INT NOT NULL,
  teacher_id INT NOT NULL,
  attendance ENUM('present', 'late', 'absent') DEFAULT 'absent',
  homework_done BOOLEAN DEFAULT TRUE,
  comment TEXT,
  score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_attendance (class_id, session_date, student_id)
);

-- Thêm cột homework_done nếu bảng đã tồn tại
ALTER TABLE session_comments 
ADD COLUMN homework_done BOOLEAN DEFAULT TRUE AFTER attendance;

-- Tạo bảng session_records nếu cần (để ghi lại tên buổi học)
CREATE TABLE IF NOT EXISTS session_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id INT NOT NULL,
  session_number INT NOT NULL,
  session_date DATE,
  topic VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  UNIQUE KEY unique_session (class_id, session_number)
);

SELECT 'Migration completed!' AS message;
