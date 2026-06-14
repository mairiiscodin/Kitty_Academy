import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './Teacher.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const DAYS_VI = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function fmtTime(t) { return t ? t.substring(0, 5) : ''; }
function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

const ATTENDANCE_OPTIONS = [
  { value: 'present', label: 'Có mặt' },
  { value: 'late', label: 'Đi muộn' },
  { value: 'absent', label: 'Vắng' },
];

// ---- Modal nhờ GV khác ----
function SubstituteModal({ cls, onClose, onSuccess }) {
  const [teachers, setTeachers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    axios.get(`${API}/teacher/teachers/online`)
      .then(r => setTeachers(r.data.teachers?.filter(t => t.is_online) || []))
      .catch(() => setTeachers([]))
      .finally(() => setLoadingTeachers(false));
  }, []);

  const handleSend = async () => {
    if (!selectedId) return setMsg({ type: 'error', text: 'Vui lòng chọn giáo viên' });
    setLoading(true); setMsg(null);
    try {
      await axios.post(`${API}/teacher/cancel-request`, {
        schedule_id: cls.schedule_id,
        substitute_teacher_id: Number(selectedId),
        reason,
      });
      setMsg({ type: 'success', text: 'Đã gửi yêu cầu thành công! GV sẽ nhận được thông báo.' });
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi gửi yêu cầu' });
    } finally { setLoading(false); }
  };

  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal">
        <div className="t-modal-header">
          <div className="t-modal-title">
            <span className="t-modal-icon">🔄</span>
            Nhờ giáo viên khác dạy thay
          </div>
          <button className="t-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="t-modal-class-info">
          <div className="t-modal-class-name">{cls.name}</div>
          <div className="t-modal-class-meta">
            <span>📅 {DAYS_VI[cls.day_of_week]}</span>
            <span>🕐 {fmtTime(cls.start_time)} - {fmtTime(cls.end_time)}</span>
            <span className={`t-type-badge ${cls.type}`}>{cls.type === 'vip' ? 'VIP' : 'Trải nghiệm'}</span>
          </div>
        </div>

        <div className="t-modal-body">
          <div className="t-modal-section">
            <label className="t-modal-label">
              <span className="t-dot-green"></span>
              Giáo viên đang online ({loadingTeachers ? '...' : teachers.length} người)
            </label>
            {loadingTeachers ? (
              <div className="t-modal-loading">Đang tải danh sách giáo viên...</div>
            ) : teachers.length === 0 ? (
              <div className="t-modal-empty">
                <span>😔</span>
                <span>Hiện không có giáo viên nào đang online</span>
              </div>
            ) : (
              <div className="t-teacher-grid">
                {teachers.map(t => (
                  <div
                    key={t.id}
                    className={`t-teacher-option ${selectedId == t.id ? 'selected' : ''}`}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <div className="t-teacher-avatar">{t.full_name.charAt(0)}</div>
                    <div className="t-teacher-detail">
                      <div className="t-teacher-name">{t.full_name}</div>
                      <div className="t-teacher-meta">{t.class_count} lớp đang dạy</div>
                    </div>
                    <div className="t-online-dot"></div>
                    {selectedId == t.id && <div className="t-check">✓</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="t-modal-section">
            <label className="t-modal-label">Lý do hủy lớp</label>
            <textarea
              className="t-modal-textarea"
              placeholder="Ví dụ: Bận việc gia đình, bệnh, công việc đột xuất..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {msg && <div className={`t-modal-msg ${msg.type}`}>{msg.text}</div>}
        </div>

        <div className="t-modal-footer">
          <button className="t-btn-cancel" onClick={onClose}>Huỷ bỏ</button>
          <button
            className="t-btn-send"
            onClick={handleSend}
            disabled={loading || !selectedId || teachers.length === 0}
          >
            {loading ? 'Đang gửi...' : '📨 Gửi yêu cầu'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Modal điểm danh ----
function AttendanceModal({ cls, onClose, onSaved }) {
  const [sessionDate, setSessionDate] = useState(todayISO());
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const fetchStudents = useCallback(() => {
    setLoading(true);
    setMsg(null);
    axios.get(`${API}/teacher/classes/${cls.id}/students`, { params: { date: sessionDate } })
      .then(r => {
        const rows = (r.data.students || []).map(s => ({
          ...s,
          attendance: s.attendance || 'present',
          homework_done: s.homework_done === 0 ? false : s.homework_done !== false,
          comment: s.comment || '',
        }));
        setStudents(rows);
      })
      .catch(err => {
        setStudents([]);
        setMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi tải danh sách học viên' });
      })
      .finally(() => setLoading(false));
  }, [cls.id, sessionDate]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const updateStudent = (studentId, patch) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...patch } : s));
  };

  const markAll = attendance => {
    setStudents(prev => prev.map(s => ({ ...s, attendance })));
  };

  const handleSave = async () => {
    if (students.length === 0) return setMsg({ type: 'error', text: 'Lớp chưa có học viên để điểm danh' });
    setSaving(true);
    setMsg(null);
    try {
      const records = students.map(s => ({
        student_id: s.id,
        attendance: s.attendance,
        homework_done: Boolean(s.homework_done),
        comment: s.comment,
      }));
      const r = await axios.post(`${API}/teacher/classes/${cls.id}/attendance`, {
        session_date: sessionDate,
        records,
      });
      setMsg({ type: 'success', text: `Đã lưu điểm danh. Lớp đã dạy ${r.data.session_count ?? 0} buổi.` });
      onSaved?.();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi lưu điểm danh' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal t-attendance-modal">
        <div className="t-modal-header">
          <div className="t-modal-title">
            <span className="t-modal-icon">✓</span>
            Điểm danh lớp
          </div>
          <button className="t-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="t-modal-class-info">
          <div className="t-modal-class-name">{cls.name}</div>
          <div className="t-modal-class-meta">
            <span>{DAYS_VI[cls.day_of_week]}</span>
            <span>{fmtTime(cls.start_time)} - {fmtTime(cls.end_time)}</span>
            <span>{cls.student_count ?? 0} học viên</span>
            <span>{cls.session_count ?? 0} buổi đã dạy</span>
          </div>
        </div>

        <div className="t-modal-body">
          <div className="t-att-toolbar">
            <div className="t-att-date">
              <label>Ngày học</label>
              <input
                type="date"
                value={sessionDate}
                onChange={e => setSessionDate(e.target.value || todayISO())}
              />
            </div>
            <div className="t-att-actions">
              <button type="button" onClick={() => markAll('present')}>Tất cả có mặt</button>
              <button type="button" onClick={() => markAll('late')}>Tất cả đi muộn</button>
              <button type="button" onClick={() => markAll('absent')}>Tất cả vắng</button>
            </div>
          </div>

          {msg && <div className={`t-modal-msg ${msg.type}`}>{msg.text}</div>}

          {loading ? (
            <div className="t-modal-loading">Đang tải danh sách học viên...</div>
          ) : students.length === 0 ? (
            <div className="t-modal-empty">
              <span>📚</span>
              <span>Lớp chưa có học viên</span>
            </div>
          ) : (
            <div className="t-att-list">
              {students.map(student => (
                <div key={student.id} className="t-att-row">
                  <div className="t-att-student">
                    <div className="t-att-avatar">{student.full_name?.charAt(0) || '?'}</div>
                    <div className="t-att-info">
                      <div className="t-att-name">{student.full_name}</div>
                      <div className="t-att-username">@{student.username}</div>
                    </div>
                  </div>

                  <select
                    className={`t-att-select ${student.attendance}`}
                    value={student.attendance}
                    onChange={e => updateStudent(student.id, { attendance: e.target.value })}
                  >
                    {ATTENDANCE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  <label className="t-att-homework">
                    <input
                      type="checkbox"
                      checked={Boolean(student.homework_done)}
                      onChange={e => updateStudent(student.id, { homework_done: e.target.checked })}
                    />
                    Bài tập
                  </label>

                  <input
                    className="t-att-comment"
                    value={student.comment}
                    placeholder="Nhận xét"
                    onChange={e => updateStudent(student.id, { comment: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="t-modal-footer">
          <button className="t-btn-cancel" onClick={onClose}>Đóng</button>
          <button className="t-btn-send" onClick={handleSave} disabled={saving || loading || students.length === 0}>
            {saving ? 'Đang lưu...' : 'Lưu điểm danh'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Class Card ----
function ClassCard({ cls, onCancelRequest }) {
  const [showModal, setShowModal] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);

  return (
    <>
      <div className="t-cls-card">
        <div className="t-cls-card-top">
          <div className="t-cls-icon-wrap">
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
              <rect x="4" y="8" width="40" height="32" rx="4" fill="#2d7a3a" opacity="0.12" />
              <rect x="4" y="8" width="40" height="32" rx="4" stroke="#2d7a3a" strokeWidth="2" />
              <line x1="4" y1="18" x2="44" y2="18" stroke="#2d7a3a" strokeWidth="2" />
              <circle cx="24" cy="30" r="6" fill="#2d7a3a" opacity="0.35" />
            </svg>
          </div>
          <div className="t-cls-card-info">
            <div className="t-cls-card-name">{cls.name}</div>
            <span className={`t-type-badge ${cls.type}`}>{cls.type === 'vip' ? 'VIP' : 'Trải nghiệm'}</span>
          </div>
        </div>

        <div className="t-cls-card-meta">
          <div className="t-cls-meta-row">
            <span className="t-meta-icon">👥</span>
            <span>{cls.student_count ?? 0} học viên</span>
          </div>
          <div className="t-cls-meta-row">
            <span className="t-meta-icon">✓</span>
            <span>{cls.session_count ?? 0} buổi đã dạy</span>
          </div>
          <div className="t-cls-meta-row">
            <span className="t-meta-icon">📅</span>
            <span>{DAYS_VI[cls.day_of_week]}</span>
          </div>
          <div className="t-cls-meta-row">
            <span className="t-meta-icon">🕐</span>
            <span>{fmtTime(cls.start_time)} - {fmtTime(cls.end_time)}</span>
          </div>
          {cls.description && (
            <div className="t-cls-meta-row">
              <span className="t-meta-icon">📝</span>
              <span className="t-cls-desc">{cls.description}</span>
            </div>
          )}
        </div>

        <div className="t-cls-actions">
          <button className="t-btn-attendance" onClick={() => setShowAttendance(true)}>
            Điểm danh
          </button>
          <button className="t-btn-cancel-class" onClick={() => setShowModal(true)}>
            🔄 Nhờ GV khác dạy thay
          </button>
        </div>
      </div>

      {showAttendance && (
        <AttendanceModal
          cls={cls}
          onClose={() => setShowAttendance(false)}
          onSaved={onCancelRequest}
        />
      )}

      {showModal && (
        <SubstituteModal
          cls={cls}
          onClose={() => setShowModal(false)}
          onSuccess={onCancelRequest}
        />
      )}
    </>
  );
}

// ---- Main ----
export default function TeacherClasses({ type = 'all' }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const titleMap = { vip: 'Lịch dạy lớp VIP', trial: 'Lịch dạy lớp Trải nghiệm', all: 'Tất cả lớp học' };
  const url = type === 'all'
    ? `${API}/teacher/dashboard`
    : `${API}/teacher/classes/${type}`;

  const fetchClasses = useCallback(() => {
    setLoading(true);
    axios.get(url)
      .then(r => {
        if (type === 'all') setClasses(r.data.myClasses || []);
        else setClasses(r.data.classes || []);
      })
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, [url, type]);

  useEffect(() => { fetchClasses(); }, [fetchClasses, refreshKey]);

  return (
    <div className="t-page">
      <h1 className="t-page-title">{titleMap[type]}</h1>
      <p className="t-page-sub">
        {type === 'vip' && 'Danh sách lớp học sinh đã đăng ký chính thức'}
        {type === 'trial' && 'Danh sách lớp học sinh đang học thử'}
        {type === 'all' && 'Tất cả lớp bạn đang phụ trách'}
      </p>

      {loading ? (
        <div className="t-loading">Đang tải...</div>
      ) : classes.length === 0 ? (
        <div className="t-empty-state">
          <div className="t-empty-icon">📚</div>
          <div>Chưa có lớp học nào</div>
        </div>
      ) : (
        <div className="t-cls-grid">
          {classes.map((cls, i) => (
            <ClassCard
              key={cls.schedule_id || i}
              cls={cls}
              onCancelRequest={() => setRefreshKey(k => k + 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
