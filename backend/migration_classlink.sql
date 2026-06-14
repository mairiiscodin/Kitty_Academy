USE kitty_academy;

-- Thêm cột class_link vào bảng classes
ALTER TABLE classes 
  ADD COLUMN IF NOT EXISTS class_link VARCHAR(500) NULL 
  COMMENT 'Link Meet/Zoom/...' 
  AFTER description;

SELECT 'Migration class_link done!' AS message;
