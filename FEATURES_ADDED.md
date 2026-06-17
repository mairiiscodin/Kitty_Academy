# Tính Năng Theo Dõi Tiến Trình Học Sinh

## 📋 Tóm Tắt
Hệ thống quản lý lớp học đã được cập nhật để hỗ trợ theo dõi tiến trình học sinh, bao gồm:
- **Admin**: Tạo/sửa lớp với tổng số buổi học
- **Giáo viên**: Điểm danh để cập nhật tiến trình học sinh
- **Học sinh**: Xem tiến trình học (số buổi đã học / tổng buổi)

---

## 🚀 Các Tính Năng Chi Tiết

### 1. Admin - Quản Lí Lớp Học
**Tạo/Sửa Lớp**
- Thêm trường: **"Tổng số buổi học"** (mặc định: 10)
- Khi tạo/sửa lớp, admin có thể nhập tổng số buổi

**Xem Danh Sách Lớp**
- Hiển thị cột "Tổng buổi" trong bảng danh sách lớp
- Bảng đã được cập nhật header từ 10 thành 11 cột

**Xem Chi Tiết Tiến Trình Học Sinh** 
- Endpoint mới: `GET /admin/classes/:id/progress`
- Trả về danh sách học sinh với:
  - Số buổi đã học (attended_sessions)
  - Số buổi vắng (absent_sessions)
  - Phần trăm tiến trình (progress_percent)

**Xem Lịch Sử Điểm Danh**
- Endpoint mới: `GET /admin/classes/:classId/students/:studentId/attendance`
- Trả về lịch sử điểm danh chi tiết của học sinh

---

### 2. Giáo Viên - Điểm Danh
**Điểm Danh Học Sinh** (Đã Tồn Tại)
- Endpoint: `POST /teacher/classes/:id/attendance`
- Khi giáo viên điểm danh, hệ thống sẽ:
  - Ghi nhận điểm danh (present, late, absent)
  - Cập nhật `session_comments` table
  - Tự động cập nhật tiến trình học sinh

**Thông Tin Thêm**
- `session_date`: Ngày học
- `attendance`: Trạng thái (present, absent, late)
- `comment`: Nhận xét thêm
- `homework_done`: Làm bài tập hay không

---

### 3. Học Sinh - Xem Tiến Trình
**Trang "Lớp của tôi"**
- Hiển thị: **Số buổi đã học / Tổng buổi**
- Thêm **Thanh tiến trình** (progress bar) hiển thị phần trăm
- Ví dụ: "5/20 buổi" với thanh tiến trình 25%

**Thông Tin Hiển Thị**
- Buổi đã học (present + late)
- Tổng số buổi của lớp (từ trường total_sessions)
- Số buổi vắng (absent)
- Thanh tiến trình màu xanh động

---

## 🗄️ Database Changes

### Migration SQL
**File**: `backend/migration_sessions_tracking.sql`

```sql
-- Thêm cột vào bảng classes
ALTER TABLE classes 
ADD COLUMN total_sessions INT DEFAULT 10 AFTER max_students;

-- Tạo/cập nhật bảng session_comments
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
  ...
);
```

---

## 🔌 API Endpoints

### Admin Routes

| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| GET | `/admin/classes` | Danh sách lớp (có total_sessions, session_count) |
| POST | `/admin/classes` | Tạo lớp (thêm total_sessions) |
| PUT | `/admin/classes/:id` | Sửa lớp (thêm total_sessions) |
| GET | `/admin/classes/:id/students` | Danh sách học sinh với tiến trình |
| GET | `/admin/classes/:id/progress` | Chi tiết tiến trình tất cả học sinh |
| GET | `/admin/classes/:classId/students/:studentId/attendance` | Lịch sử điểm danh học sinh |

### Teacher Routes (Existing)

| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| GET | `/teacher/classes/:id/students?date=YYYY-MM-DD` | Danh sách học sinh (có attendance) |
| POST | `/teacher/classes/:id/attendance` | Ghi nhận điểm danh |

### Student Routes

| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| GET | `/student/dashboard` | Dashboard (có total_sessions) |
| GET | `/student/my-classes` | Lớp của tôi (có total_sessions) |

---

## 💻 Frontend Changes

### AdminDashboard.js
- **ClassFormModal**: 
  - Thêm input "Tổng số buổi học"
  - Cập nhật emptyForm và initial state
  - Gửi `total_sessions` trong request

- **Classes Table**:
  - Cập nhật header: Sĩ số → Sĩ số + Tổng buổi (2 cột)
  - Hiển thị `cls.student_count` và `cls.total_sessions`
  - Cập nhật colSpan từ 10 thành 11

### StudentPages.js
- **StudentMyClasses**:
  - Cập nhật `.s-cls-session-summary`
  - Thay thế "class_session_count" → "total_sessions"
  - Thêm progress bar: `<div className="s-progress-bar">`
  - Hiển thị: "X buổi đã học / Y tổng buổi"

### Student.css
- **Progress Bar Styles**:
  ```css
  .s-progress-bar {
    width: 100%;
    height: 8px;
    background: #e2f0e4;
    border-radius: 4px;
    overflow: hidden;
    flex: 1;
  }
  .s-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #2d7a3a, #1e9066);
    border-radius: 4px;
    transition: width 0.3s ease;
  }
  ```

---

## 🎯 Workflow Sử Dụng

### Admin Workflow
1. Tạo lớp → Nhập tổng số buổi (VD: 20)
2. Xem danh sách lớp → Cột "Tổng buổi" hiển thị
3. (Tùy chọn) Xem chi tiết tiến trình: Click button "👁️ Xem tiến trình"

### Teacher Workflow
1. Vào trang "Lớp của tôi"
2. Chọn lớp → Xem danh sách học sinh
3. Chọn ngày học → Điểm danh học sinh
4. Lưu điểm danh → Tiến trình học sinh được cập nhật tự động

### Student Workflow
1. Vào trang "Lớp của tôi"
2. Xem card lớp hiển thị:
   - "X buổi đã học"
   - "Y tổng buổi"
   - Progress bar: "X/Y"
3. Theo dõi tiến trình học

---

## 🔧 Installation/Migration Steps

### 1. Apply Database Migration
```bash
# Chạy migration SQL
mysql -u root -p kitty_academy < backend/migration_sessions_tracking.sql

# Hoặc chạy từng command trong MySQL Workbench
```

### 2. Restart Backend Server
```bash
# Trong thư mục backend
npm install  # (nếu cần)
npm start
```

### 3. Rebuild Frontend (Optional)
```bash
# Trong thư mục frontend
npm run build
```

---

## ✅ Testing Checklist

- [ ] Admin tạo lớp với "Tổng buổi học" = 20
- [ ] Admin xem danh sách lớp → Hiển thị cột "Tổng buổi"
- [ ] Giáo viên điểm danh → Lưu thành công
- [ ] Học sinh xem "Lớp của tôi" → Hiển thị "X buổi đã học / 20"
- [ ] Progress bar cập nhật chính xác
- [ ] Admin xem "Chi tiết tiến trình" → Hiển thị danh sách học sinh với progress %

---

## 📝 Notes

- **Default total_sessions**: 10 (nếu admin không nhập)
- **Attendance Status**: present, late, absent
- **Progress Calculation**: `(attended_sessions / total_sessions) * 100%`
- **Attended Sessions**: Tính từ `attendance IN ('present', 'late')`

---

## 🐛 Known Issues / TODOs

- [ ] Trang admin "Chi tiết tiến trình" chưa có UI, chỉ có API
- [ ] Có thể thêm nút "Xem tiến trình" trong bảng admin để link đến trang chi tiết
- [ ] Có thể thêm export report tiến trình học sinh (PDF/Excel)

---

**Cập nhật**: 2026-06-15  
**Version**: 1.1.0 - Progress Tracking Release
