import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import TeacherHome from './TeacherHome';
import TeacherClasses from './TeacherClasses';
import TeacherOnline from './TeacherOnline';
import TeacherNotifications from './TeacherNotifications';
import './Teacher.css';
import DBLogo from '../../assets/dashboard-logo.png';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ---- Icons ----
const Ico = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const HomeIcon = () => <Ico d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" />;
const CrownIcon = () => <Ico d="M2 20h20 M4 20L6 10l6 5 6-5 2 10" />;
const CalendarIcon = () => <Ico d="M8 2v4M16 2v4M3 8h18M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" />;
const UsersIcon = () => <Ico d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />;
const ClassIcon = () => <Ico d="M22 10v6M2 10l10-5 10 5-10 5-10-5z M6 12v5c3 3 9 3 12 0v-5" />;
const BellIcon = () => <Ico d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />;
const SettingsIcon = () => <Ico d="M12 20a8 8 0 100-16 8 8 0 000 16z M12 14a2 2 0 100-4 2 2 0 000 4z" />;
const LogoutIcon = () => <Ico d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />;
const ChevDown = () => <Ico d="M6 9l6 6 6-6" size={13} />;

// ---- Sidebar ----
const Sidebar = ({ user, unread, onLogout }) => {
  const [open, setOpen] = useState({ home: true, classes: true, teachers: true });
  const tog = k => setOpen(p => ({ ...p, [k]: !p[k] }));

  return (
    <div className="t-sidebar">
      <div className="t-sidebar-logo">
        <img className="dashboard-logo-img" src={DBLogo} alt="Kitty Academy" />
        <div>
          <div className="t-brand">Kitty Academy</div>
          <div className="t-brand-sub">—Global Learning Community</div>
        </div>
      </div>

      <div className="t-sidebar-user">
        <div className="t-avatar">{user?.full_name?.charAt(0) || 'G'}</div>
        <div className="t-user-info">
          <div className="t-user-name">{user?.full_name}</div>
          <div className="t-user-role">Giáo viên</div>
          <div className="t-user-status"><span className="t-dot" />Online</div>
        </div>
      </div>

      <nav className="t-nav">
        <div className="t-nav-section">
          <button className="t-nav-head" onClick={() => tog('home')}>
            <span>TRANG CHỦ</span><ChevDown />
          </button>
          {open.home && (
            <div className="t-nav-items">
              <NavLink to="/teacher" end className={({ isActive }) => `t-nav-item${isActive ? ' active' : ''}`}>
                <HomeIcon /> Trang chủ
              </NavLink>
            </div>
          )}
        </div>

        <div className="t-nav-section">
          <button className="t-nav-head" onClick={() => tog('classes')}>
            <span>LỚP HỌC</span><ChevDown />
          </button>
          {open.classes && (
            <div className="t-nav-items">
              <NavLink to="/teacher/classes/vip" className={({ isActive }) => `t-nav-item${isActive ? ' active' : ''}`}>
                <CrownIcon /> Lịch dạy lớp chính thức
              </NavLink>
              <NavLink to="/teacher/classes/trial" className={({ isActive }) => `t-nav-item${isActive ? ' active' : ''}`}>
                <CalendarIcon /> Lịch dạy lớp trải nghiệm
              </NavLink>
            </div>
          )}
        </div>

        <div className="t-nav-section">
          <button className="t-nav-head" onClick={() => tog('teachers')}>
            <span>GIÁO VIÊN</span><ChevDown />
          </button>
          {open.teachers && (
            <div className="t-nav-items">
              <NavLink to="/teacher/online" className={({ isActive }) => `t-nav-item${isActive ? ' active' : ''}`}>
                <UsersIcon /> Giáo viên
              </NavLink>
              <NavLink to="/teacher/my-classes" className={({ isActive }) => `t-nav-item${isActive ? ' active' : ''}`}>
                <ClassIcon /> Lớp học
              </NavLink>
            </div>
          )}
        </div>
      </nav>

      <div className="t-sidebar-footer">
        <button className="t-foot-btn" title="Cài đặt"><SettingsIcon /></button>
        <NavLink to="/teacher/notifications" className="t-foot-btn t-bell-wrap" title="Thông báo">
          <BellIcon />
          {unread > 0 && <span className="t-badge">{unread > 9 ? '9+' : unread}</span>}
        </NavLink>
        <button className="t-foot-btn t-logout" title="Đăng xuất" onClick={onLogout}><LogoutIcon /></button>
      </div>
    </div>
  );
};

// ---- Main ----
export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  // Ping online status mỗi 30s
  const ping = useCallback(async () => {
    try { await axios.post(`${API}/teacher/ping`); } catch { }
  }, []);

  useEffect(() => {
    ping();
    const iv = setInterval(ping, 30000);
    return () => {
      clearInterval(iv);
      axios.post(`${API}/teacher/offline`).catch(() => { });
    };
  }, [ping]);

  // Poll unread notifications
  const fetchUnread = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/teacher/notifications`);
      setUnread(r.data.unread || 0);
    } catch { }
  }, []);

  useEffect(() => {
    fetchUnread();
    const iv = setInterval(fetchUnread, 15000);
    return () => clearInterval(iv);
  }, [fetchUnread]);

  const handleLogout = async () => {
    await axios.post(`${API}/teacher/offline`).catch(() => { });
    logout();
    navigate('/login');
  };

  return (
    <div className="t-layout">
      <Sidebar user={user} unread={unread} onLogout={handleLogout} />
      <main className="t-main">
        <Routes>
          <Route path="/" element={<TeacherHome />} />
          <Route path="/classes/vip" element={<TeacherClasses type="vip" />} />
          <Route path="/classes/trial" element={<TeacherClasses type="trial" />} />
          <Route path="/online" element={<TeacherOnline />} />
          <Route path="/my-classes" element={<TeacherClasses type="all" />} />
          <Route path="/notifications" element={<TeacherNotifications onRead={fetchUnread} />} />
        </Routes>
      </main>
    </div>
  );
}
