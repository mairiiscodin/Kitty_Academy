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
  { key: '18:00', start_time: '18:00', end_time: '18:45', label: '18:00 - 18:45' },
  { key: '18:45', start_time: '18:45', end_time: '19:30', label: '18:45 - 19:30' },
  { key: '19:30', start_time: '19:30', end_time: '20:15', label: '19:30 - 20:15' },
  { key: '20:15', start_time: '20:15', end_time: '21:00', label: '20:15 - 21:00' },
];

const timeValue = value => String(value || '').substring(0, 5);
const defaultSchedule = { day_of_week: '1', start_time: '18:00', end_time: '18:45' };

export default function StudentAvailability() {
  const [schedules, setSchedules] = useState([defaultSchedule]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    axios.get(`${API}/student/availability`)
      .then(r => {
        const saved = (r.data.slots || []).map(slot => ({
          day_of_week: String(slot.day_of_week ?? '1'),
          start_time: timeValue(slot.start_time) || '18:00',
          end_time: timeValue(slot.end_time) || '18:45',
        }));
        setSchedules(saved.length > 0 ? saved : [defaultSchedule]);
      })
      .catch(() => setMsg({ ok: false, text: 'Không tải được lịch đã đăng ký' }))
      .finally(() => setLoading(false));
  }, []);

  const slots = useMemo(() => (
    schedules
      .map(schedule => ({
        day_of_week: Number(schedule.day_of_week),
        start_time: schedule.start_time,
        end_time: schedule.end_time,
      }))
      .filter((slot, index, arr) => arr.findIndex(item => (
        item.day_of_week === slot.day_of_week &&
        item.start_time === slot.start_time &&
        item.end_time === slot.end_time
      )) === index)
  ), [schedules]);

  const setScheduleDay = (index, value) => {
    setSchedules(prev => prev.map((schedule, i) => (
      i === index ? { ...schedule, day_of_week: value } : schedule
    )));
  };

  const setScheduleSlot = (index, slotKey) => {
    const slot = SLOTS.find(item => item.key === slotKey) || SLOTS[0];
    setSchedules(prev => prev.map((schedule, i) => (
      i === index ? { ...schedule, start_time: slot.start_time, end_time: slot.end_time } : schedule
    )));
  };

  const addSchedule = () => {
    setSchedules(prev => [...prev, defaultSchedule]);
  };

  const removeSchedule = (index) => {
    setSchedules(prev => (
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
    ));
  };

  const save = async () => {
    if (slots.length === 0) {
      return setMsg({ ok: false, text: 'Vui lòng chọn lịch học' });
    }
    setSaving(true);
    setMsg(null);
    try {
      await axios.post(`${API}/student/availability`, { slots, note });
      setMsg({ ok: true, text: 'Đã lưu lịch học và gửi thông báo cho admin' });
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.message || 'Lỗi lưu lịch học' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="s-page">
      <h1 className="s-page-title">Đăng ký lịch học</h1>
      <p className="s-page-sub">Chọn các khung giờ bạn rảnh để học trong tuần, sau đó ấn lưu.</p>

      {msg && <div className={`s-form-msg ${msg.ok ? 'success' : 'error'}`}>{msg.text}</div>}

      {loading ? (
        <div className="s-loading">Đang tải lịch đăng ký...</div>
      ) : (
        <div className="s-register-card">
          <div className="s-register-grid">
            <div className="s-register-field full">
              <div className="s-register-row-head">
                <label>Lịch học có thể học</label>
                <button type="button" className="s-mini-btn" onClick={addSchedule}>
                  + Thêm buổi
                </button>
              </div>
              <div className="s-register-schedules">
                {schedules.map((schedule, index) => (
                  <div className="s-register-schedule-row" key={index}>
                    <select value={schedule.day_of_week} onChange={e => setScheduleDay(index, e.target.value)}>
                      {DAYS.map(day => <option key={day.value} value={day.value}>{day.label}</option>)}
                    </select>
                    <select value={timeValue(schedule.start_time)} onChange={e => setScheduleSlot(index, e.target.value)}>
                      {SLOTS.map(slot => <option key={slot.key} value={slot.key}>{slot.label}</option>)}
                    </select>
                    <button type="button" className="s-mini-danger" onClick={() => removeSchedule(index)} title="Xóa buổi">
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="s-register-field full">
              <label>Ghi chú</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder="VD: Em muốn học lớp tối, cần xếp lịch sau 19:30..."
              />
            </div>
          </div>

          <div className="s-register-footer">
            <span>Đã chọn {slots.length} buổi rảnh, dùng 4 khung giờ cố định của trung tâm.</span>
            <button className="s-btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu lịch học'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
