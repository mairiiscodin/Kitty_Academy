import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import StudentHome from './StudentHome';
import StudentMyClasses from './StudentMyClasses';
import StudentSchedule from './StudentSchedule';
import StudentComments from './StudentComments';
import StudentNotifications from './StudentNotifications';
import StudentAvailability from './StudentAvailability';
import StudentClassRegistration from './StudentClassRegistration';
import './Student.css';
import DBLogo from '../../assets/dashboard-logo.png';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Ico = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const HomeIcon    = () => <Ico d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10" />;
const ClassIcon   = () => <Ico d="M22 10v6M2 10l10-5 10 5-10 5-10-5z M6 12v5c3 3 9 3 12 0v-5" />;
const CalIcon     = () => <Ico d="M8 2v4M16 2v4M3 8h18M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" />;
const CommentIcon = () => <Ico d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />;
const BellIcon    = () => <Ico d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />;
const SettingsIcon= () => <Ico d="M12 20a8 8 0 100-16 8 8 0 000 16z M12 14a2 2 0 100-4 2 2 0 000 4z" />;
const LogoutIcon  = () => <Ico d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />;
const ChevDown    = () => <Ico d="M6 9l6 6 6-6" size={13} />;

const Sidebar = ({ user, unread, onLogout }) => {
  const [open, setOpen] = useState({ home: true, courses: true, results: true });
  const tog = k => setOpen(p => ({ ...p, [k]: !p[k] }));

  return (
    <div className="s-sidebar">
      <div className="s-sidebar-logo">
        <img className="dashboard-logo-img" src={DBLogo} alt="Kitty Academy" />
        <div>
          <div className="s-brand">Kitty Academy</div>
          <div className="s-brand-sub">—Global Learning Community</div>
        </div>
      </div>

      <div className="s-sidebar-user">
        <div className="s-avatar">{user?.full_name?.charAt(0) || 'H'}</div>
        <div className="s-user-info">
          <div className="s-user-name">{user?.full_name}</div>
          <div className="s-user-role">Học sinh</div>
          <div className="s-user-status"><span className="s-dot" />Online</div>
        </div>
      </div>

      <nav className="s-nav">
        <div className="s-nav-section">
          <button className="s-nav-head" onClick={() => tog('home')}>
            <span>TRANG CHỦ</span><ChevDown />
          </button>
          {open.home && (
            <div className="s-nav-items">
              <NavLink to="/student" end className={({ isActive }) => `s-nav-item${isActive ? ' active' : ''}`}>
                <HomeIcon /> Trang chủ
              </NavLink>
            </div>
          )}
        </div>

        <div className="s-nav-section">
          <button className="s-nav-head" onClick={() => tog('courses')}>
            <span>KHÓA HỌC</span><ChevDown />
          </button>
          {open.courses && (
            <div className="s-nav-items">
              <NavLink to="/student/my-classes" className={({ isActive }) => `s-nav-item${isActive ? ' active' : ''}`}>
                <ClassIcon /> Lớp của tôi
              </NavLink>
              <NavLink to="/student/schedule" className={({ isActive }) => `s-nav-item${isActive ? ' active' : ''}`}>
                <CalIcon /> Thời khóa biểu
              </NavLink>
              <NavLink to="/student/availability" className={({ isActive }) => `s-nav-item${isActive ? ' active' : ''}`}>
                <CalIcon /> Đăng ký lịch học
              </NavLink>
              <NavLink to="/student/register-class" className={({ isActive }) => `s-nav-item${isActive ? ' active' : ''}`}>
                <ClassIcon /> Đăng ký lớp
              </NavLink>
            </div>
          )}
        </div>

        <div className="s-nav-section">
          <button className="s-nav-head" onClick={() => tog('results')}>
            <span>KẾT QUẢ</span><ChevDown />
          </button>
          {open.results && (
            <div className="s-nav-items">
              <NavLink to="/student/comments" className={({ isActive }) => `s-nav-item${isActive ? ' active' : ''}`}>
                <CommentIcon /> Nhận xét của giáo viên
              </NavLink>
            </div>
          )}
        </div>
      </nav>

      <div className="s-sidebar-footer">
        <button className="s-foot-btn" title="Cài đặt"><SettingsIcon /></button>
        <NavLink to="/student/notifications" className="s-foot-btn s-bell-wrap" title="Thông báo">
          <BellIcon />
          {unread > 0 && <span className="s-badge">{unread > 9 ? '9+' : unread}</span>}
        </NavLink>
        <button className="s-foot-btn s-logout" title="Đăng xuất" onClick={onLogout}><LogoutIcon /></button>
      </div>
    </div>
  );
};

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  const ping = useCallback(async () => {
    try { await axios.post(`${API}/student/ping`); } catch {}
  }, []);

  useEffect(() => {
    ping();
    const iv = setInterval(ping, 30000);
    return () => { clearInterval(iv); axios.post(`${API}/student/offline`).catch(() => {}); };
  }, [ping]);

  const fetchUnread = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/student/notifications`);
      setUnread(r.data.unread || 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchUnread();
    const iv = setInterval(fetchUnread, 15000);
    return () => clearInterval(iv);
  }, [fetchUnread]);

  const handleLogout = async () => {
    await axios.post(`${API}/student/offline`).catch(() => {});
    logout(); navigate('/login');
  };

  return (
    <div className="s-layout">
      <Sidebar user={user} unread={unread} onLogout={handleLogout} />
      <main className="s-main">
        <Routes>
          <Route path="/" element={<StudentHome />} />
          <Route path="/my-classes" element={<StudentMyClasses />} />
          <Route path="/schedule" element={<StudentSchedule />} />
          <Route path="/availability" element={<StudentAvailability />} />
          <Route path="/register-class" element={<StudentClassRegistration />} />
          <Route path="/comments" element={<StudentComments />} />
          <Route path="/notifications" element={<StudentNotifications onRead={fetchUnread} />} />
        </Routes>
      </main>
    </div>
  );
}
