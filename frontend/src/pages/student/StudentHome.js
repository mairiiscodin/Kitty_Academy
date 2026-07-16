import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const TIME_SLOTS = [
  { label: '18:00 - 18:45', start: '18:00' },
  { label: '18:45 - 19:30', start: '18:45' },
  { label: '19:30 - 20:15', start: '19:30' },
  { label: '20:15 - 21:00', start: '20:15' },
];
const CLASS_COLORS = ['#c8e6c9', '#b2dfdb', '#bbdefb', '#f8bbd0', '#fff9c4', '#e1bee7', '#ffccbc'];

function getSlotIndex(time) {
  const hour = time ? time.substring(0, 5) : '';
  return { '18:00': 0, '18:45': 1, '19:30': 2, '20:15': 3 }[hour] ?? -1;
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

  const {
    myClasses = [],
    schedule = [],
    recentComments = [],
    attendance = {},
  } = data || {};

  const uniqueClasses = [];
  const seen = new Set();
  myClasses.forEach(classItem => {
    if (!seen.has(classItem.id)) {
      seen.add(classItem.id);
      uniqueClasses.push(classItem);
    }
  });

  const colorMap = {};
  let colorIndex = 0;
  const timetable = Array(4).fill(null).map(() => Array(7).fill(null));
  schedule.forEach(item => {
    if (!colorMap[item.class_id]) {
      colorMap[item.class_id] = CLASS_COLORS[colorIndex++ % CLASS_COLORS.length];
    }

    const row = getSlotIndex(item.start_time);
    const col = Number(item.day_of_week);
    if (row >= 0 && col >= 0 && col < 7) {
      timetable[row][col] = item;
    }
  });

  const presentCount = Number(attendance.present_count || 0);
  const totalSessions = Number(attendance.total_sessions || 0);

  return (
    <div className="s-page">
      <h1 className="s-page-title">Bảng điều khiển - Học sinh</h1>
      <p className="s-page-sub">Chào mừng {user?.full_name} trở lại học tập!</p>

      <div className="s-home-top">
        <div className="s-card s-current-class">
          <div className="s-card-title">Lớp của tôi</div>
          {uniqueClasses.length === 0 ? (
            <div className="s-empty">Bạn chưa được xếp lớp.</div>
          ) : (
            <div className="s-class-chips">
              {uniqueClasses.map(classItem => (
                <div key={classItem.id} className="s-class-chip">
                  <div className="s-chip-name">{classItem.name}</div>
                  <div className="s-chip-bar" />
                  <div className="s-chip-meta">
                    <span className={`s-type-badge ${classItem.type}`}>
                      {classItem.type === 'vip' ? 'Chính thức' : 'Trải nghiệm'}
                    </span>
                    <span className="s-chip-teacher">
                      GV: {classItem.teacher_name || 'Chưa có giáo viên'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="s-stats-col">
          <div className="s-stat-mini">
            <div className="s-stat-num">{uniqueClasses.length}</div>
            <div className="s-stat-lbl">Lớp đang học</div>
          </div>
          <div className="s-stat-mini attend">
            <div className="s-stat-num">{presentCount}/{totalSessions}</div>
            <div className="s-stat-lbl">Chuyên cần</div>
          </div>
        </div>
      </div>

      <div className="s-card s-timetable-card">
        <div className="s-card-title">Thời khóa biểu trong tuần</div>
        <div className="s-tt-wrap">
          <table className="s-tt">
            <thead>
              <tr>
                <th className="s-tt-th-time" />
                {DAYS.map(day => <th key={day} className="s-tt-th">{day}</th>)}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot, row) => (
                <tr key={slot.start}>
                  <td className="s-tt-time">{slot.label}</td>
                  {DAYS.map((day, col) => {
                    const item = timetable[row][col];
                    return (
                      <td key={day} className="s-tt-cell">
                        {item && (
                          <div
                            className="s-tt-event"
                            style={{ background: colorMap[item.class_id] || '#c8e6c9' }}
                          >
                            {item.class_name}
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

      {recentComments.length > 0 && (
        <div className="s-home-bottom">
          <div className="s-card s-comments-preview">
            <div className="s-card-title">Nhận xét gần nhất</div>
            {recentComments.map(comment => (
              <div key={comment.id} className="s-comment-mini">
                <div className="s-comment-mini-head">
                  <span className="s-comment-date">
                    {new Date(comment.session_date).toLocaleDateString('vi-VN')}
                  </span>
                  <span className={`s-attend-badge ${comment.attendance}`}>
                    {comment.attendance === 'present'
                      ? 'Có mặt'
                      : comment.attendance === 'absent'
                        ? 'Vắng'
                        : 'Muộn'}
                  </span>
                </div>
                <div className="s-comment-mini-text">{comment.comment || '-'}</div>
                <div className="s-comment-mini-teacher">GV: {comment.teacher_name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
