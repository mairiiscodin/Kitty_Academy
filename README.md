# 🎓 Kitty Academy - Web App

## Cấu trúc dự án
```
kitty-academy/
├── backend/          # Node.js + Express API
│   ├── middleware/
│   ├── routes/
│   ├── db.js
│   ├── server.js
│   ├── database.sql  ← Chạy cái này trước
│   ├── package.json
│   └── .env.example  ← Copy thành .env
└── frontend/         # React App
    ├── src/
    │   ├── context/
    │   ├── components/
    │   ├── pages/
    │   ├── App.js
    │   └── index.js
    └── package.json
```

---

## 🚀 Hướng dẫn cài đặt

### Bước 1: Cài đặt MySQL Database

```bash
# Đăng nhập MySQL
mysql -u root -p

# Chạy file SQL để tạo DB + dữ liệu mẫu
mysql -u root -p < backend/database.sql
```

### Bước 2: Cấu hình Backend

```bash
cd backend

# Copy file env và chỉnh sửa
cp .env.example .env
```

Mở file `.env` và sửa lại:
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=mật_khẩu_mysql_của_bạn
DB_NAME=kitty_academy
JWT_SECRET=kitty_academy_super_secret_key_2024
```

```bash
# Cài dependencies
npm install

# Chạy backend
npm run dev     # development (tự động reload)
# hoặc
npm start       # production
```

Backend sẽ chạy tại: http://localhost:5000

### Bước 3: Cấu hình Frontend

```bash
cd frontend

# Cài dependencies
npm install

# Chạy frontend
npm start
```

Frontend sẽ chạy tại: http://localhost:3000

---

## 🔑 Tài khoản mặc định

| Tài khoản | Mật khẩu  | Vai trò |
|-----------|-----------|---------|
| admin     | password  | Admin   |
| teacher01 | password  | Giáo viên |
| student01 | password  | Học viên |

> ⚠️ **Quan trọng**: Đổi mật khẩu ngay sau khi cài đặt!

---

## 📡 API Endpoints

### Auth
- `POST /api/auth/login` — Đăng nhập
- `GET /api/auth/me` — Thông tin user hiện tại

### Admin (cần token + role admin)
- `GET /api/admin/dashboard` — Thống kê tổng quan
- `GET/POST/PUT/DELETE /api/admin/users` — Quản lí user
- `GET/POST/PUT/DELETE /api/admin/classes` — Quản lí lớp học
- `GET /api/admin/teachers` — Danh sách giáo viên
- `GET /api/admin/students` — Danh sách học viên

---

## 🛠 Tech Stack

| Layer    | Technology         |
|----------|--------------------|
| Frontend | React 18, React Router v6, Axios |
| Backend  | Node.js, Express.js |
| Database | MySQL 8.x          |
| Auth     | JWT (JSON Web Token) |
| Password | bcryptjs           |
