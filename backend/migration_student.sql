-- =============================================
-- Migration: Thêm bảng cho học sinh
-- Chạy: mysql -u root -p kitty_academy < migration_student.sql
-- =============================================

USE kitty_academy;

-- Bảng điểm (giữa kỳ + cuối kỳ)
CREATE TABLE IF NOT EXISTS grades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  class_id INT NOT NULL,
  midterm_score DECIMAL(4,1) NULL COMMENT 'Điểm giữa kỳ 0-10',
  final_score DECIMAL(4,1) NULL COMMENT 'Điểm cuối kỳ 0-10',
  average_score DECIMAL(4,1) NULL COMMENT 'Điểm trung bình tự tính',
  semester VARCHAR(50) DEFAULT '2024-2025',
  note TEXT,
  created_by INT COMMENT 'GV nhập điểm',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_class_sem (student_id, class_id, semester),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Bảng nhận xét từng buổi học
CREATE TABLE IF NOT EXISTS session_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  class_id INT NOT NULL,
  teacher_id INT NOT NULL,
  session_date DATE NOT NULL,
  attendance ENUM('present','absent','late') DEFAULT 'present' COMMENT 'Có mặt/Vắng/Muộn',
  comment TEXT COMMENT 'Nhận xét buổi học',
  homework_done BOOLEAN DEFAULT TRUE COMMENT 'Có làm bài tập không',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_class_date (student_id, class_id, session_date),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =============================================
-- Dữ liệu mẫu
-- =============================================

-- Điểm mẫu cho student01 (id=5) lớp GD_ENG_001 (id=1)
INSERT IGNORE INTO grades (student_id, class_id, midterm_score, final_score, average_score, semester, created_by) VALUES
(5, 1, 7.5, 8.0, 7.75, '2024-2025', 2),
(6, 1, 6.0, 7.0, 6.5,  '2024-2025', 2),
(7, 2, 8.5, 9.0, 8.75, '2024-2025', 2);

-- Nhận xét buổi học mẫu cho student01
INSERT IGNORE INTO session_comments (student_id, class_id, teacher_id, session_date, attendance, comment, homework_done) VALUES
(5, 1, 2, DATE_SUB(CURDATE(), INTERVAL 14 DAY), 'present', 'Học sinh tích cực phát biểu, nắm bài tốt. Cần cải thiện phát âm một số từ.', TRUE),
(5, 1, 2, DATE_SUB(CURDATE(), INTERVAL 7 DAY),  'present', 'Tiến bộ rõ rệt trong kỹ năng nghe. Bài tập về nhà hoàn thành đầy đủ.', TRUE),
(5, 1, 2, DATE_SUB(CURDATE(), INTERVAL 3 DAY),  'late',    'Đến muộn 10 phút. Cần chú ý giờ giấc. Học lực ổn định.', TRUE),
(5, 1, 2, CURDATE(),                             'present', 'Buổi học hôm nay rất tốt, hoàn thành bài tập trên lớp xuất sắc.', TRUE);

SELECT 'Migration student completed!' AS message;
