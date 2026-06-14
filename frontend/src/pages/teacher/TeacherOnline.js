import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './Teacher.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function timeSince(dateStr) {
  if (!dateStr) return 'Chưa xác định';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  return `${Math.floor(diff / 3600)} giờ trước`;
}

// ---- Teacher Card ----
function TeacherCard({ teacher, isOnline }) {
  return (
    <div className={`t-online-card ${isOnline ? 'online' : 'offline'}`}>
      <div className="t-online-avatar-wrap">
        <div className="t-online-avatar">{teacher.full_name.charAt(0)}</div>
        <div className={`t-online-indicator ${isOnline ? 'on' : 'off'}`}></div>
      </div>
      <div className="t-online-info">
        <div className="t-online-name">{teacher.full_name}</div>
        <div className="t-online-username">@{teacher.username}</div>
        <div className="t-online-meta">
          <span className="t-online-classes">📚 {teacher.class_count} lớp</span>
          {isOnline
            ? <span className="t-online-status on">● Online</span>
            : <span className="t-online-status off">● {timeSince(teacher.last_seen)}</span>
          }
        </div>
      </div>
    </div>
  );
}

// ---- All Classes List ----
function AllClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lấy cả lớp vip + trial
    Promise.all([
      axios.get(`${API}/teacher/classes/vip`),
      axios.get(`${API}/teacher/classes/trial`),
    ]).then(([vipRes, trialRes]) => {
      const all = [...(vipRes.data.classes || []), ...(trialRes.data.classes || [])];
      setClasses(all);
    }).catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, []);

  const DAYS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  if (loading) return <div className="t-loading">Đang tải...</div>;

  return (
    <div className="t-all-classes">
      {classes.length === 0 ? (
        <div className="t-empty-state"><div className="t-empty-icon">📚</div><div>Chưa có lớp</div></div>
      ) : (
        <div className="t-cls-table-wrap">
          <table className="t-cls-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tên lớp</th>
                <th>Loại</th>
                <th>Thứ</th>
                <th>Giờ học</th>
                <th>Học viên</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls, i) => (
                <tr key={cls.schedule_id || i}>
                  <td>{i + 1}</td>
                  <td><strong>{cls.name}</strong></td>
                  <td>
                    <span className={`t-type-badge ${cls.type}`}>
                      {cls.type === 'vip' ? 'VIP' : 'Trải nghiệm'}
                    </span>
                  </td>
                  <td>{DAYS_VI[cls.day_of_week]}</td>
                  <td>{cls.start_time?.substring(0,5)} - {cls.end_time?.substring(0,5)}</td>
                  <td>{cls.student_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---- Main ----
export default function TeacherOnline() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('online'); // 'online' | 'all' | 'classes'

  useEffect(() => {
    axios.get(`${API}/teacher/teachers/online`)
      .then(r => setTeachers(r.data.teachers || []))
      .catch(() => setTeachers([]))
      .finally(() => setLoading(false));
  }, []);

  const onlineTeachers = teachers.filter(t => t.is_online);
  const allTeachers = teachers;

  return (
    <div className="t-page">
      <h1 className="t-page-title">
        {tab === 'classes' ? 'Danh sách lớp học' : 'Giáo viên'}
      </h1>
      <p className="t-page-sub">
        {tab === 'online' && `${onlineTeachers.length} giáo viên đang online`}
        {tab === 'all' && `${allTeachers.length} giáo viên trong hệ thống`}
        {tab === 'classes' && 'Tất cả lớp học bạn đang phụ trách'}
      </p>

      {/* Tabs */}
      <div className="t-tabs">
        <button className={`t-tab ${tab === 'online' ? 'active' : ''}`} onClick={() => setTab('online')}>
          <span className="t-dot-green-sm"></span>
          Online ({onlineTeachers.length})
        </button>
        <button className={`t-tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>
          👥 Tất cả GV ({allTeachers.length})
        </button>
        <button className={`t-tab ${tab === 'classes' ? 'active' : ''}`} onClick={() => setTab('classes')}>
          📚 Lớp của tôi
        </button>
      </div>

      {tab === 'classes' ? (
        <AllClasses />
      ) : loading ? (
        <div className="t-loading">Đang tải...</div>
      ) : (
        <div className="t-online-grid">
          {(tab === 'online' ? onlineTeachers : allTeachers).length === 0 ? (
            <div className="t-empty-state">
              <div className="t-empty-icon">👨‍🏫</div>
              <div>
                {tab === 'online' ? 'Hiện không có giáo viên nào đang online' : 'Chưa có giáo viên'}
              </div>
            </div>
          ) : (
            (tab === 'online' ? onlineTeachers : allTeachers).map(t => (
              <TeacherCard key={t.id} teacher={t} isOnline={t.is_online} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
