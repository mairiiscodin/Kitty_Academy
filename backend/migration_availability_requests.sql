CREATE TABLE IF NOT EXISTS availability_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role ENUM('teacher', 'student') NOT NULL,
  day_of_week TINYINT NOT NULL COMMENT '0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_availability_user_slot (user_id, role, day_of_week, start_time, end_time),
  INDEX idx_availability_role_slot (role, day_of_week, start_time, end_time),
  CONSTRAINT fk_availability_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
