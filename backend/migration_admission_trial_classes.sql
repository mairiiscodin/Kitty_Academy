USE kitty_academy;

ALTER TABLE classes
ADD COLUMN trial_student_name VARCHAR(200) NULL AFTER description;
