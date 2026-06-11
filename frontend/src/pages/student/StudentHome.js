import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_SLOTS = [
  { label: '18:00 - 18:45', start: '18:00' },
  { label: '18:45 - 19:30', start: '18:45' },
  { label: '19:30 - 20:15', start: '19:30' },
  { label: '20:15 - 21:00', start: '20:15' },
];
const CLASS_COLORS = ['#c8e6c9','#b2dfdb','#bbdefb','#f8bbd0','#fff9c4','#e1bee7','#ffccbc'];

function getSlotIndex(t) {
  const h = t ? t.substring(0,5) : '';
  return { '18:00':0, '18:45':1, '19:30':2, '20:15':3 }[h] ?? -1;
}

function ScoreBar({ value, max = 10 }) {
  const pct = value != null ? (value / max) * 100 : 0;
  const color = value >= 8 ? '#2d7a3a' : value >= 6.5 ? '#f57c00' : '#e53935';
  return (
    <div className="s-score-bar-wrap">
      <div className="s-score-bar">
        <div className="s-score-fill" style={{ width: pct + '%', background: color }} />
      </div>
      <span className="s-score-val" style={{ color }}>{value ?? '—'}</span>
    </div>
  );
}

export default function StudentHome() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/student/dashboard`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="s-loading">Đang tải...</div>;

  const { myClasses = [], schedule = [], grades = [], recentComments = [], attendance = {} } = data || {};

  // Unique classes (deduplicate by class_id)
  const uniqueClasses = [];
  const seen = new Set();
  myClasses.forEach(c => { if (!seen.has(c.id)) { seen.add(c.id); uniqueClasses.push(c); } });

  // Build timetable
  const colorMap = {};
  let ci = 0;
  const timetable = Array(4).fill(null).map(() => Array(7).fill(null));
  schedule.forEach(s => {
    if (!colorMap[s.class_id]) colorMap[s.class_id] = CLASS_COLORS[ci++ % CLASS_COLORS.length];
    const row = getSlotIndex(s.start_time);
    const col = s.day_of_week;
    if (row >= 0 && col >= 0 && col < 7) timetable[row][col] = s;
  });

  const attendPct = attendance.total_sessions > 0
    ? Math.round((attendance.present_count / attendance.total_sessions) * 100) : 0;

  return (
    <div className="s-page">
      <h1 className="s-page-title">Bảng điều khiển - Học sinh</h1>
      <p className="s-page-sub">Chào mừng {user?.full_name} trở lại học tập! 📚 👋</p>

      {/* Top row: lớp hiện tại + stats */}
      <div className="s-home-top">
        {/* Lớp hiện tại */}
        <div className="s-card s-current-class">
          <div className="s-card-title">Lớp học hiện tại</div>
          {uniqueClasses.length === 0 ? (
            <div className="s-empty-sm">Chưa đăng ký lớp nào</div>
          ) : (
            <div className="s-class-chips">
              {uniqueClasses.map(cls => (
                <div key={cls.id} className="s-class-chip">
                  <div className="s-chip-name">{cls.name}</div>
                  <div className="s-chip-bar"></div>
                  <div className="s-chip-meta">
                    <span className={`s-type-badge ${cls.type}`}>{cls.type === 'vip' ? 'VIP' : 'Trải nghiệm'}</span>
                    <span className="s-chip-teacher">GV: {cls.teacher_name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Thống kê */}
        <div className="s-stats-col">
          <div className="s-stat-mini">
            <div className="s-stat-num">{uniqueClasses.length}</div>
            <div className="s-stat-lbl">Lớp đang học</div>
          </div>
          <div className="s-stat-mini attend">
            <div className="s-stat-num">{attendPct}%</div>
            <div className="s-stat-lbl">Chuyên cần</div>
          </div>
          <div className="s-stat-mini grade">
            <div className="s-stat-num">
              {grades.length > 0 && grades[0].average_score != null
                ? grades[0].average_score : '—'}
            </div>
            <div className="s-stat-lbl">Điểm TB</div>
          </div>
        </div>
      </div>

      {/* Timetable */}
      <div className="s-card s-timetable-card">
        <div className="s-card-title">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2d7a3a" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Thời Khóa Biểu
        </div>
        <div className="s-tt-wrap">
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
                          <div className="s-tt-event" style={{ background: colorMap[s.class_id] || '#c8e6c9' }}>
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

      {/* Bottom: Điểm + Nhận xét gần nhất */}
      <div className="s-home-bottom">
        {/* Điểm */}
        {grades.length > 0 && (
          <div className="s-card s-grades-preview">
            <div className="s-card-title">📊 Điểm số gần nhất</div>
            {grades.slice(0, 3).map(g => (
              <div key={g.id} className="s-grade-row">
                <div className="s-grade-class">{g.class_name}</div>
                <div className="s-grade-scores">
                  <div className="s-grade-item">
                    <span className="s-grade-lbl">Giữa kỳ</span>
                    <ScoreBar value={g.midterm_score} />
                  </div>
                  <div className="s-grade-item">
                    <span className="s-grade-lbl">Cuối kỳ</span>
                    <ScoreBar value={g.final_score} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Nhận xét gần nhất */}
        {recentComments.length > 0 && (
          <div className="s-card s-comments-preview">
            <div className="s-card-title">💬 Nhận xét gần nhất</div>
            {recentComments.map(c => (
              <div key={c.id} className="s-comment-mini">
                <div className="s-comment-mini-head">
                  <span className="s-comment-date">
                    {new Date(c.session_date).toLocaleDateString('vi-VN')}
                  </span>
                  <span className={`s-attend-badge ${c.attendance}`}>
                    {c.attendance === 'present' ? '✅ Có mặt' : c.attendance === 'absent' ? '❌ Vắng' : '⏰ Muộn'}
                  </span>
                </div>
                <div className="s-comment-mini-text">{c.comment || '—'}</div>
                <div className="s-comment-mini-teacher">GV: {c.teacher_name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
