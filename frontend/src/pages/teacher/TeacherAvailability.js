import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const DAYS = [
  { value: 1, label: 'Thứ 2' },
  { value: 2, label: 'Thứ 3' },
  { value: 3, label: 'Thứ 4' },
  { value: 4, label: 'Thứ 5' },
  { value: 5, label: 'Thứ 6' },
  { value: 6, label: 'Thứ 7' },
  { value: 0, label: 'Chủ nhật' },
];
const SLOTS = [
  { start_time: '18:00', end_time: '18:45', label: '18:00 - 18:45' },
  { start_time: '18:45', end_time: '19:30', label: '18:45 - 19:30' },
  { start_time: '19:30', end_time: '20:15', label: '19:30 - 20:15' },
  { start_time: '20:15', end_time: '21:00', label: '20:15 - 21:00' },
];

const slotKey = slot => `${slot.day_of_week}-${slot.start_time}-${slot.end_time}`;

export default function TeacherAvailability() {
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    axios.get(`${API}/teacher/availability`)
      .then(r => setSelected(new Set((r.data.slots || []).map(slotKey))))
      .catch(() => setMsg({ ok: false, text: 'Không tải được lịch đã đăng ký' }))
      .finally(() => setLoading(false));
  }, []);

  const slots = useMemo(() => {
    const picked = [];
    selected.forEach(key => {
      const [day, start, end] = key.split('-');
      picked.push({ day_of_week: Number(day), start_time: start, end_time: end });
    });
    return picked;
  }, [selected]);

  const toggle = (day, slot) => {
    const key = slotKey({ day_of_week: day, ...slot });
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await axios.post(`${API}/teacher/availability`, { slots });
      setMsg({ ok: true, text: 'Đã lưu lịch dạy và gửi thông báo cho admin' });
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.message || 'Lỗi lưu lịch dạy' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="t-page">
      <h1 className="t-page-title">Đăng ký lịch dạy</h1>
      <p className="t-page-sub">Tick các khung giờ bạn có thể dạy trong tuần, sau đó ấn lưu.</p>

      {msg && <div className={`t-modal-msg ${msg.ok ? 'success' : 'error'}`}>{msg.text}</div>}

      {loading ? (
        <div className="t-loading">Đang tải lịch đăng ký...</div>
      ) : (
        <div className="availability-card">
          <div className="availability-grid">
            <div className="availability-head">Khung giờ</div>
            {DAYS.map(day => <div key={day.value} className="availability-head">{day.label}</div>)}
            {SLOTS.map(slot => (
              <React.Fragment key={slot.label}>
                <div className="availability-time">{slot.label}</div>
                {DAYS.map(day => {
                  const key = slotKey({ day_of_week: day.value, ...slot });
                  return (
                    <button
                      key={key}
                      className={`availability-cell ${selected.has(key) ? 'checked' : ''}`}
                      onClick={() => toggle(day.value, slot)}
                    >
                      {selected.has(key) ? '✓' : ''}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          <div className="availability-footer">
            <span>Đã chọn {selected.size} khung giờ</span>
            <button className="t-btn-send" onClick={save} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu lịch dạy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
