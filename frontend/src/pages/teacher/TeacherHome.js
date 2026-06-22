import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './Teacher.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_VI = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const TIME_SLOTS = ['18:00 - 18:45', '18:45 - 19:30', '19:30 - 20:15', '20:15 - 21:00'];

function fmtTime(t) {
  if (!t) return '';
  return t.substring(0, 5);
}

function getClassLinkHref(link) {
  const trimmed = link?.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getSlotIndex(start) {
  const h = fmtTime(start);
  const map = { '18:00': 0, '18:45': 1, '19:30': 2, '20:15': 3 };
  return map[h] ?? -1;
}
function scheduleLabel(schedule) {
  return `${DAYS_VI[schedule.day_of_week]} ${fmtTime(schedule.start_time)} - ${fmtTime(schedule.end_time)}`;
}
function groupClassesById(rows) {
  const byId = new Map();
  rows.forEach(row => {
    const schedule = {
      schedule_id: row.schedule_id,
      day_of_week: row.day_of_week,
      start_time: row.start_time,
      end_time: row.end_time,
    };
    if (!byId.has(row.id)) byId.set(row.id, { ...row, schedules: [] });
    const grouped = byId.get(row.id);
    if (schedule.schedule_id && !grouped.schedules.some(s => s.schedule_id === schedule.schedule_id)) {
      grouped.schedules.push(schedule);
    }
  });
  return Array.from(byId.values()).map(row => ({
    ...row,
    schedules: row.schedules.sort((a, b) => Number(a.day_of_week) - Number(b.day_of_week) || String(a.start_time).localeCompare(String(b.start_time))),
  }));
}

// Màu cho từng lớp
const CLASS_COLORS = ['#c8e6c9', '#b2dfdb', '#bbdefb', '#f8bbd0', '#fff9c4', '#e1bee7'];

export default function TeacherHome() {
  const { user } = useAuth();
  const [myClasses, setMyClasses] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState(null);

  useEffect(() => {
    axios.get(`${API}/teacher/dashboard`)
      .then(r => {
        setMyClasses(r.data.myClasses || []);
        setSchedule(r.data.schedule || []);
        setStats(r.data.stats || {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Build timetable grid: slot[row][col] = schedule item
  const timetable = Array(4).fill(null).map(() => Array(7).fill(null));
  const colorMap = {};
  let colorIdx = 0;
  schedule.forEach(s => {
    const row = getSlotIndex(s.start_time);
    const col = s.day_of_week;
    if (row >= 0 && col >= 0 && col < 7) {
      timetable[row][col] = s;
    }
    if (!colorMap[s.class_id]) {
      colorMap[s.class_id] = CLASS_COLORS[colorIdx++ % CLASS_COLORS.length];
    }
  });
  const groupedClasses = useMemo(() => groupClassesById(myClasses), [myClasses]);
  const selectedClass = groupedClasses.find(cls => String(cls.id) === String(selectedClassId)) || groupedClasses[0];

  useEffect(() => {
    if (groupedClasses.length > 0 && !groupedClasses.some(cls => String(cls.id) === String(selectedClassId))) {
      setSelectedClassId(groupedClasses[0].id);
    }
  }, [groupedClasses, selectedClassId]);

  if (loading) return <div className="t-loading">Đang tải...</div>;

  return (
    <div className="t-page">
      <h1 className="t-page-title">Bảng điều khiển - Giáo viên</h1>
      <p className="t-page-sub">Chào mừng trở lại làm việc, {user?.full_name}! 👋</p>

      {/* Stats row */}
      <div className="t-stats-row">
        <div className="t-stat-chip vip">
          <span className="chip-num">{stats.total_vip ?? 0}</span>
          <span className="chip-lbl">Lớp VIP</span>
        </div>
        <div className="t-stat-chip trial">
          <span className="chip-num">{stats.total_trial ?? 0}</span>
          <span className="chip-lbl">Lớp Trải nghiệm</span>
        </div>
        <div className="t-stat-chip noti">
          <span className="chip-num">{stats.unread_noti ?? 0}</span>
          <span className="chip-lbl">Thông báo mới</span>
        </div>
      </div>

      <div className="t-home-grid">
        {/* Left: My Classes */}
        <div className="t-section">
          <div className="t-section-head">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d7a3a" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
            <span>Lớp học của tôi</span>
          </div>
          <div className="t-home-class-page">
            {groupedClasses.length === 0 && (
              <div className="t-empty">Chưa có lớp học nào</div>
            )}
            {groupedClasses.length > 0 && selectedClass && (
              <>
                <div className="t-home-class-tabs">
                  {groupedClasses.map(cls => (
                    <button
                      key={cls.id}
                      className={`t-home-class-tab ${String(cls.id) === String(selectedClass.id) ? 'active' : ''}`}
                      onClick={() => setSelectedClassId(cls.id)}
                    >
                      {cls.name}
                    </button>
                  ))}
                </div>

                <div className="t-home-class-detail">
                  <div className="t-home-class-head">
                    <div>
                      <div className="t-class-eyebrow">{selectedClass.type === 'vip' ? 'Lớp VIP' : 'Lớp trải nghiệm'}</div>
                      <div className="t-home-class-name">{selectedClass.name}</div>
                    </div>
                    <span className={`t-type-badge ${selectedClass.type}`}>
                      {selectedClass.type === 'vip' ? 'VIP' : 'Thu'}
                    </span>
                  </div>

                  <div className="t-home-class-stats">
                    <div><span>Học viên</span><strong>{selectedClass.student_count ?? 0}</strong></div>
                    <div><span>Buổi đã dạy</span><strong>{selectedClass.session_count ?? 0}</strong></div>
                    <div><span>Tổng buổi</span><strong>{selectedClass.total_sessions || 10}</strong></div>
                  </div>

                  <div className="t-home-class-block">
                    <label>Lịch học</label>
                    <div className="t-schedule-list">
                      {selectedClass.schedules.map(item => (
                        <span className="t-schedule-chip" key={item.schedule_id}>{scheduleLabel(item)}</span>
                      ))}
                    </div>
                  </div>

                  <div className="t-home-class-block">
                    <label>Link lop hoc</label>
                    {selectedClass.class_link ? (
                      <a className="t-class-link compact" href={getClassLinkHref(selectedClass.class_link)} target="_blank" rel="noreferrer" title={selectedClass.class_link}>
                        Vào lớp học
                      </a>
                    ) : (
                      <span className="t-muted">Chưa có link</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Timetable */}
        <div className="t-section">
          <div className="t-section-head">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2d7a3a" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Thời Khóa Biểu</span>
          </div>
          <div className="t-timetable-wrap">
            <table className="t-timetable">
              <thead>
                <tr>
                  <th className="t-tt-time"></th>
                  {DAYS.map(d => <th key={d} className="t-tt-day">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot, ri) => (
                  <tr key={ri}>
                    <td className="t-tt-time-cell">{slot}</td>
                    {Array(7).fill(null).map((_, ci) => {
                      const s = timetable[ri][ci];
                      return (
                        <td key={ci} className="t-tt-cell">
                          {s && (
                            <div
                              className="t-tt-event"
                              style={{ background: colorMap[s.class_id] || '#c8e6c9' }}
                            >
                              {s.class_name}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
