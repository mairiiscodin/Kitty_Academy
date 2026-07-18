import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const DAYS_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const timeValue = value => String(value || '').substring(0, 5);
const formatClassSize = cls => `${cls.student_count ?? 0}/${cls.max_students || 30}`;
const formatSessionCount = cls => `${cls.session_count ?? 0}/${cls.total_sessions || 10}`;
const formatSchedules = schedules => (
  schedules?.length
    ? schedules.map(schedule => (
      `${DAYS_SHORT[Number(schedule.day_of_week)] || '-'} ${timeValue(schedule.start_time)} - ${timeValue(schedule.end_time)}`
    )).join(', ')
    : 'Chưa có lịch'
);

export default function StudentClassRegistration() {
  const [classes, setClasses] = useState([]);
  const [hasRegisteredClass, setHasRegisteredClass] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [msg, setMsg] = useState(null);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/student/available-classes`);
      setClasses(res.data.classes || []);
      setHasRegisteredClass(Boolean(res.data.has_registered_class));
    } catch {
      setClasses([]);
      setHasRegisteredClass(false);
      setMsg({ ok: false, text: 'Không tải được danh sách lớp' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const registerClass = async (classId) => {
    setSavingId(classId);
    setMsg(null);
    try {
      await axios.post(`${API}/student/classes/${classId}/register`);
      setMsg({ ok: true, text: 'Đã đăng ký lớp thành công' });
      fetchClasses();
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.message || 'Lỗi đăng ký lớp' });
    } finally {
      setSavingId(null);
    }
  };

  const cancelRegistration = async (classId) => {
    setSavingId(classId);
    setMsg(null);
    try {
      await axios.delete(`${API}/student/classes/${classId}/register`);
      setMsg({ ok: true, text: 'Đã hủy đăng ký lớp' });
      fetchClasses();
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.message || 'Lỗi hủy đăng ký lớp' });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="s-page">
      <h1 className="s-page-title">Đăng ký lớp</h1>
      <p className="s-page-sub">Chọn một lớp còn chỗ để đăng ký. Sau khi đăng ký, lớp sẽ xuất hiện trong danh sách lớp hiện tại của bạn.</p>

      {msg && <div className={`s-form-msg ${msg.ok ? 'success' : 'error'}`}>{msg.text}</div>}
      {!loading && hasRegisteredClass && (
        <div className="s-form-msg success">Bạn chỉ được đăng ký 1 lớp. Hủy lớp hiện tại nếu muốn chọn lớp khác.</div>
      )}

      {loading ? (
        <div className="s-loading">Đang tải danh sách lớp...</div>
      ) : classes.length === 0 ? (
        <div className="s-empty-state"><div className="s-empty-icon">!</div><div>Chưa có lớp nào để đăng ký</div></div>
      ) : (
        <div className="s-register-card">
          <div className="s-table-wrap">
            <table className="s-register-table">
              <thead>
                <tr>
                  <th>Tên lớp</th>
                  <th>Giáo viên</th>
                  <th>Ngày học</th>
                  <th>Sĩ số</th>
                  <th>Điểm danh / Tổng buổi</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {classes.map(cls => {
                  const isRegistered = Boolean(cls.is_registered);
                  const blockedByLimit = hasRegisteredClass && !isRegistered;
                  const disabled = cls.is_full || savingId === cls.id || blockedByLimit;
                  return (
                    <tr key={cls.id}>
                      <td><strong>{cls.name}</strong></td>
                      <td>{cls.teacher_name || 'Chưa có giáo viên'}</td>
                      <td>{formatSchedules(cls.schedules)}</td>
                      <td>{formatClassSize(cls)}</td>
                      <td>{formatSessionCount(cls)}</td>
                      <td className="s-register-action">
                        {isRegistered && (
                          <div className="s-register-status">Bạn đã đăng ký lớp này</div>
                        )}
                        {isRegistered ? (
                          <button
                            className="s-btn-secondary"
                            onClick={() => cancelRegistration(cls.id)}
                            disabled={savingId === cls.id}
                          >
                            {savingId === cls.id ? 'Đang hủy...' : 'Hủy đăng ký'}
                          </button>
                        ) : (
                          <button
                            className="s-btn-primary"
                            onClick={() => registerClass(cls.id)}
                            disabled={disabled}
                          >
                            {savingId === cls.id
                              ? 'Đang đăng ký...'
                              : blockedByLimit
                                ? 'Đã có lớp'
                              : cls.is_full
                                ? 'Đã đủ'
                                : 'Đăng ký'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
