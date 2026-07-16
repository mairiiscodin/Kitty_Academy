// StudentMyClasses.js
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const DAYS_VI = ['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];

function fmtTime(t) { return t ? t.substring(0, 5) : ''; }
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

export function StudentMyClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState(null);

  useEffect(() => {
    axios.get(`${API}/student/my-classes`)
      .then(r => setClasses(r.data.classes || []))
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, []);

  const displayClasses = useMemo(() => groupClassesById(classes), [classes]);
  const selectedClass = displayClasses.find(cls => String(cls.id) === String(selectedClassId)) || displayClasses[0];

  useEffect(() => {
    if (displayClasses.length > 0 && !displayClasses.some(cls => String(cls.id) === String(selectedClassId))) {
      setSelectedClassId(displayClasses[0].id);
    }
  }, [displayClasses, selectedClassId]);

  const progressPct = selectedClass?.total_sessions
    ? Math.round(((selectedClass.learned_sessions ?? 0) / selectedClass.total_sessions) * 100)
    : 0;

  return (
    <div className="s-page">
      <h1 className="s-page-title">Lớp của tôi</h1>
      <p className="s-page-sub">Thông tin lớp học bạn đang đăng ký tại trung tâm</p>
      {loading ? <div className="s-loading">Đang tải...</div> :
        displayClasses.length === 0 ? (
          <div className="s-empty-state"><div className="s-empty-icon">!</div><div>Chưa đăng ký lớp nào</div></div>
        ) : (
          <div className="s-class-page">
            <aside className="s-class-list-panel">
              <div className="s-class-list-title">Danh sách lớp</div>
              <div className="s-class-list-detail">
                {displayClasses.map(cls => (
                  <button
                    key={cls.id}
                    className={`s-class-list-item ${String(cls.id) === String(selectedClass?.id) ? 'active' : ''}`}
                    onClick={() => setSelectedClassId(cls.id)}
                  >
                    <span>{cls.name}</span>
                    <span className={`s-type-badge ${cls.type}`}>{cls.type === 'vip' ? 'Chính thức' : 'Trải nghiệm'}</span>
                  </button>
                ))}
              </div>
            </aside>

            <section className="s-class-detail-page">
              <div className="s-class-detail-head">
                <div>
                  <div className="s-class-eyebrow">{selectedClass.type === 'vip' ? 'Lớp chính thức' : 'Lớp trải nghiệm'}</div>
                  <h2 className="s-class-detail-title">{selectedClass.name}</h2>
                </div>
                <span className={`s-type-badge ${selectedClass.type}`}>{selectedClass.type === 'vip' ? 'Chính thức' : 'Trải nghiệm'}</span>
              </div>

              <div className="s-class-stats">
                <div><strong>{selectedClass.learned_sessions ?? 0}</strong><span>buổi đã học</span></div>
                <div><strong>{selectedClass.total_sessions ?? 10}</strong><span>tổng buổi</span></div>
                <div><strong>{selectedClass.absent_sessions ?? 0}</strong><span>buổi vắng</span></div>
              </div>

              <div className="s-progress-bar s-class-progress">
                <div className="s-progress-fill" style={{ width: `${progressPct}%` }}></div>
              </div>

              <div className="s-class-info-grid">
                <div className="s-class-info-block">
                  <label>Giáo viên</label>
                  <div>{selectedClass.teacher_name || 'Chưa có giáo viên'}</div>
                </div>
                <div className="s-class-info-block">
                  <label>Lịch học</label>
                  <div className="s-schedule-list">
                    {selectedClass.schedules.map(item => (
                      <span className="s-schedule-chip" key={item.schedule_id}>{scheduleLabel(item)}</span>
                    ))}
                  </div>
                </div>
                <div className="s-class-info-block full">
                  <label>Mô tả</label>
                  <div>{selectedClass.description || 'Không có mô tả'}</div>
                </div>
                {selectedClass.enrollment_date && (
                  <div className="s-class-info-block full">
                    <label>Ngày đăng ký</label>
                    <div>{new Date(selectedClass.enrollment_date).toLocaleDateString('vi-VN')}</div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )
      }
    </div>
  );
}
// =============================================

const TIME_SLOTS = [
  { label: '18:00 - 18:45', start: '18:00' },
  { label: '18:45 - 19:30', start: '18:45' },
  { label: '19:30 - 20:15', start: '19:30' },
  { label: '20:15 - 21:00', start: '20:15' },
];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const CLASS_COLORS = ['#c8e6c9','#b2dfdb','#bbdefb','#f8bbd0','#fff9c4','#e1bee7','#ffccbc'];

export function StudentSchedule() {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/student/schedule`)
      .then(r => setSchedule(r.data.schedule || []))
      .catch(() => setSchedule([]))
      .finally(() => setLoading(false));
  }, []);

  const colorMap = {}; let ci = 0;
  const timetable = Array(4).fill(null).map(() => Array(7).fill(null));
  schedule.forEach(s => {
    if (!colorMap[s.class_id]) colorMap[s.class_id] = CLASS_COLORS[ci++ % CLASS_COLORS.length];
    const row = { '18:00':0,'18:45':1,'19:30':2,'20:15':3 }[s.start_time?.substring(0,5)] ?? -1;
    if (row >= 0 && s.day_of_week >= 0) timetable[row][s.day_of_week] = s;
  });

  return (
    <div className="s-page">
      <h1 className="s-page-title">Thời khóa biểu</h1>
      <p className="s-page-sub">Lịch học hàng tuần của bạn</p>
      {loading ? <div className="s-loading">Đang tải...</div> : (
        <div className="s-card" style={{padding: 0, overflow: 'hidden'}}>
          <div style={{padding: '16px 20px', borderBottom: '1px solid #f0f0f0', fontWeight: 800, fontSize: 15, color: '#1a3a22', display:'flex', alignItems:'center', gap:8}}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2d7a3a" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Thời Khóa Biểu
          </div>
          <div className="s-tt-wrap" style={{padding: 16}}>
            <table className="s-tt">
              <thead>
                <tr>
                  <th className="s-tt-th-time"></th>
                  {DAYS.map(d => <th key={d} className="s-tt-th">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((slot, ri) => (
                  <tr key={ri}>
                    <td className="s-tt-time">{slot.label}</td>
                    {Array(7).fill(null).map((_, ci2) => {
                      const s = timetable[ri][ci2];
                      return (
                        <td key={ci2} className="s-tt-cell">
                          {s && (
                            <div className="s-tt-event" style={{background: colorMap[s.class_id]}}>
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
          {/* Legend */}
          <div className="s-tt-legend">
            {schedule.filter((s,i,a)=>a.findIndex(x=>x.class_id===s.class_id)===i).map(s=>(
              <div key={s.class_id} className="s-tt-legend-item">
                <div className="s-tt-legend-dot" style={{background: colorMap[s.class_id]}}></div>
                <span>{s.class_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================

function ScoreCircle({ value, label }) {
  const color = value == null ? '#ccc' : value >= 8 ? '#2d7a3a' : value >= 6.5 ? '#f57c00' : '#e53935';
  const rank = value == null ? '—' : value >= 8 ? 'Giỏi' : value >= 6.5 ? 'Khá' : value >= 5 ? 'TB' : 'Yếu';
  return (
    <div className="s-score-circle-wrap">
      <div className="s-score-circle" style={{'--score-color': color}}>
        <span className="s-score-num">{value ?? '—'}</span>
      </div>
      <div className="s-score-label">{label}</div>
      {value != null && <div className="s-score-rank" style={{color}}>{rank}</div>}
    </div>
  );
}

export function StudentGrades() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/student/grades`)
      .then(r => setGrades(r.data.grades || []))
      .catch(() => setGrades([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="s-page">
      <h1 className="s-page-title">Bảng điểm</h1>
      <p className="s-page-sub">Kết quả học tập của bạn</p>
      {loading ? <div className="s-loading">Đang tải...</div> :
        grades.length === 0 ? (
          <div className="s-empty-state"><div className="s-empty-icon">📊</div><div>Chưa có điểm nào</div></div>
        ) : (
          <div className="s-grades-list">
            {grades.map(g => (
              <div key={g.id} className="s-grade-card">
                <div className="s-grade-card-header">
                  <div>
                    <div className="s-grade-card-name">{g.class_name}</div>
                    <div className="s-grade-card-meta">
                      <span className={`s-type-badge ${g.class_type}`}>{g.class_type === 'vip' ? 'Chính thức' : 'Trải nghiệm'}</span>
                      <span className="s-grade-semester">Kỳ: {g.semester}</span>
                      {g.teacher_name && <span className="s-grade-teacher">GV: {g.teacher_name}</span>}
                    </div>
                  </div>
                </div>
                <div className="s-grade-scores-row">
                  <ScoreCircle value={g.midterm_score} label="Giữa kỳ" />
                  <div className="s-grade-divider"></div>
                  <ScoreCircle value={g.final_score} label="Cuối kỳ" />
                  <div className="s-grade-divider"></div>
                  <ScoreCircle value={g.average_score} label="Trung bình" />
                </div>
                {g.note && <div className="s-grade-note">📝 {g.note}</div>}
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

// =============================================

export function StudentComments() {
  const [comments, setComments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/student/my-classes`)
      .then(r => {
        const cls = r.data.classes || [];
        const unique = cls.filter((c,i,a)=>a.findIndex(x=>x.id===c.id)===i);
        setClasses(unique);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = selectedClass
      ? `${API}/student/comments?class_id=${selectedClass}`
      : `${API}/student/comments`;
    axios.get(url)
      .then(r => setComments(r.data.comments || []))
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [selectedClass]);

  const attendConfig = {
    present: { label: 'Có mặt', icon: '✅', color: '#2d7a3a', bg: '#e8f5e9' },
    absent:  { label: 'Vắng mặt', icon: '❌', color: '#c62828', bg: '#ffebee' },
    late:    { label: 'Đi muộn', icon: '⏰', color: '#f57c00', bg: '#fff3e0' },
  };

  return (
    <div className="s-page">
      <h1 className="s-page-title">Nhận xét của giáo viên</h1>
      <p className="s-page-sub">Nhận xét từng buổi học từ giáo viên của bạn</p>

      {/* Filter */}
      {classes.length > 1 && (
        <div className="s-filter-row">
          <label className="s-filter-label">Lọc theo lớp:</label>
          <select className="s-filter-select" value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}>
            <option value="">Tất cả lớp</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      {loading ? <div className="s-loading">Đang tải...</div> :
        comments.length === 0 ? (
          <div className="s-empty-state"><div className="s-empty-icon">💬</div><div>Chưa có nhận xét nào</div></div>
        ) : (
          <div className="s-comments-list">
            {comments.map(c => {
              const cfg = attendConfig[c.attendance] || attendConfig.present;
              return (
                <div key={c.id} className="s-comment-card">
                  <div className="s-comment-card-left">
                    <div className="s-comment-date-box">
                      <div className="s-comment-day">{new Date(c.session_date).getDate()}</div>
                      <div className="s-comment-month">
                        Th.{new Date(c.session_date).getMonth()+1}
                      </div>
                      <div className="s-comment-year">{new Date(c.session_date).getFullYear()}</div>
                    </div>
                  </div>
                  <div className="s-comment-card-body">
                    <div className="s-comment-card-header">
                      <span className="s-comment-class">{c.class_name}</span>
                      <span className="s-attend-badge-lg" style={{color: cfg.color, background: cfg.bg}}>
                        {cfg.icon} {cfg.label}
                      </span>
                      {c.homework_done !== undefined && (
                        <span className="s-hw-badge" style={{color: c.homework_done?'#2d7a3a':'#e53935', background: c.homework_done?'#e8f5e9':'#ffebee'}}>
                          {c.homework_done ? '📋 Có BT' : '📋 Thiếu BT'}
                        </span>
                      )}
                    </div>
                    <div className="s-comment-text">
                      {c.comment || <span style={{color:'#bbb', fontStyle:'italic'}}>Không có nhận xét</span>}
                    </div>
                    <div className="s-comment-footer">
                      <span>👨‍🏫 {c.teacher_name}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

// =============================================

function timeAgo(d) {
  if (!d) return '';
  const s = Math.floor((Date.now()-new Date(d))/1000);
  if (s < 60) return 'Vừa xong';
  if (s < 3600) return `${Math.floor(s/60)} phút trước`;
  if (s < 86400) return `${Math.floor(s/3600)} giờ trước`;
  return `${Math.floor(s/86400)} ngày trước`;
}

export function StudentNotifications({ onRead }) {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      const r = await axios.get(`${API}/student/notifications`);
      setNotifications(r.data.notifications || []);
      setUnread(r.data.unread || 0);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const readAll = async () => {
    await axios.put(`${API}/student/notifications/read-all`).catch(()=>{});
    fetch(); onRead?.();
  };

  return (
    <div className="s-page">
      <div className="s-noti-header">
        <div>
          <h1 className="s-page-title">Thông báo</h1>
          <p className="s-page-sub">{unread > 0 ? `${unread} thông báo chưa đọc` : 'Đã đọc hết'}</p>
        </div>
        {unread > 0 && <button className="s-btn-read-all" onClick={readAll}>✓ Đánh dấu đã đọc</button>}
      </div>
      {loading ? <div className="s-loading">Đang tải...</div> :
        notifications.length === 0 ? (
          <div className="s-empty-state"><div className="s-empty-icon">🔔</div><div>Chưa có thông báo</div></div>
        ) : (
          <div className="s-noti-list">
            {notifications.map(n => (
              <div key={n.id} className={`s-noti-card ${!n.is_read ? 'unread' : ''}`}>
                <div className="s-noti-icon">🔔</div>
                <div className="s-noti-body">
                  <div className="s-noti-title">{n.title}</div>
                  <div className="s-noti-msg">{n.message}</div>
                  {n.sender_name && <div className="s-noti-sender">👤 {n.sender_name}</div>}
                  <div className="s-noti-time">{timeAgo(n.created_at)}</div>
                </div>
                {!n.is_read && <div className="s-noti-dot"></div>}
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}
