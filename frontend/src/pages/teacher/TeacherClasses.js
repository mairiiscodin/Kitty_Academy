import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import './Teacher.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const DAYS_VI = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

function fmtTime(t) { return t ? t.substring(0, 5) : ''; }
function getClassLinkHref(link) {
  const trimmed = link?.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
function scheduleLabel(schedule) {
  return `${DAYS_VI[schedule.day_of_week]} ${fmtTime(schedule.start_time)} - ${fmtTime(schedule.end_time)}`;
}
function getClassSchedules(cls) {
  return cls.schedules?.length
    ? cls.schedules
    : [{ schedule_id: cls.schedule_id, day_of_week: cls.day_of_week, start_time: cls.start_time, end_time: cls.end_time }];
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
    if (!byId.has(row.id)) {
      byId.set(row.id, { ...row, schedules: [] });
    }
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

const ATTENDANCE_OPTIONS = [
  { value: 'present', label: 'Có mặt' },
  { value: 'late', label: 'Đi muộn' },
  { value: 'absent', label: 'Vắng' },
];

// ---- Modal nhờ GV khác ----
function LeaveRequestModal({ cls, onClose, onSuccess }) {
  const schedules = getClassSchedules(cls);
  const [selectedScheduleId, setSelectedScheduleId] = useState(String(schedules[0]?.schedule_id || ''));
  const [leaveDate, setLeaveDate] = useState(todayISO());
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleSend = async () => {
    if (!selectedScheduleId) return setMsg({ type: 'error', text: 'Vui lòng chọn buổi học' });
    if (!leaveDate) return setMsg({ type: 'error', text: 'Vui lòng chọn ngày nghỉ' });
    if (!reason.trim()) return setMsg({ type: 'error', text: 'Vui lòng nhập lý do nghỉ' });
    setLoading(true); setMsg(null);
    try {
      await axios.post(`${API}/teacher/leave-request`, {
        schedule_id: Number(selectedScheduleId),
        leave_date: leaveDate,
        reason,
      });
      setMsg({ type: 'success', text: 'Đã gửi thông báo xin nghỉ cho admin và học sinh của lớp.' });
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Lỗi gửi xin nghỉ' });
    } finally { setLoading(false); }
  };

  return (
    <div className="t-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="t-modal">
        <div className="t-modal-header">
          <div className="t-modal-title">
            <span className="t-modal-icon">!</span>
            Xin nghỉ lớp
          </div>
          <button className="t-modal-close" onClick={onClose}>x</button>
        </div>

        <div className="t-modal-class-info">
          <div className="t-modal-class-name">{cls.name}</div>
          <div className="t-modal-class-meta">
            <span>{DAYS_VI[cls.day_of_week]}</span>
            <span>{fmtTime(cls.start_time)} - {fmtTime(cls.end_time)}</span>
            <span className={`t-type-badge ${cls.type}`}>{cls.type === 'vip' ? 'Chính thức' : 'Trải nghiệm'}</span>
          </div>
        </div>

        <div className="t-modal-body">
          <div className="t-modal-section">
            <label className="t-modal-label">Buổi học *</label>
            <select className="t-modal-select" value={selectedScheduleId} onChange={e => setSelectedScheduleId(e.target.value)}>
              {schedules.map(schedule => (
                <option key={schedule.schedule_id} value={schedule.schedule_id}>
                  {scheduleLabel(schedule)}
                </option>
              ))}
            </select>
          </div>

          <div className="t-modal-section">
            <label className="t-modal-label">Ngày nghỉ *</label>
            <input
              className="t-modal-input"
              type="date"
              value={leaveDate}
              onChange={e => setLeaveDate(e.target.value)}
            />
          </div>

          <div className="t-modal-section">
            <label className="t-modal-label">Lý do nghỉ *</label>
            <textarea
              className="t-modal-textarea"
              placeholder="Ví dụ: Bận việc gia đình, bệnh, công việc đột xuất..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
            />
          </div>

          {msg && <div className={`t-modal-msg ${msg.type}`}>{msg.text}</div>}
        </div>

        <div className="t-modal-footer">
          <button className="t-btn-cancel" onClick={onClose}>Hủy bỏ</button>
          <button
            className="t-btn-send"
            onClick={handleSend}
            disabled={loading || !reason.trim()}
          >
            {loading ? 'Đang gửi...' : 'Gửi xin nghỉ'}
          </button>
        </div>
      </div>
    </div>
  );
}
// ---- Modal điểm danh ----
function AttendanceModal({ cls, onClose, onSaved }) {
  const schedules = getClassSchedules(cls);
  const [selectedScheduleId, setSelectedScheduleId] = useState(String(schedules[0]?.schedule_id || ''));
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
              <label>Buổi học</label>
              <select
                className="t-modal-select"
                value={selectedScheduleId}
                onChange={e => setSelectedScheduleId(e.target.value)}
              >
                {schedules.map(schedule => (
                  <option key={schedule.schedule_id} value={schedule.schedule_id}>
                    {scheduleLabel(schedule)}
                  </option>
                ))}
              </select>
            </div>
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

// ---- Class Detail Page ----
function ClassDetailPage({ classes, selectedId, onSelect, onCancelRequest }) {
  const selectedClass = classes.find(cls => String(cls.id) === String(selectedId)) || classes[0];
  const [showModal, setShowModal] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const schedules = selectedClass ? getClassSchedules(selectedClass) : [];

  if (!selectedClass) return null;

  return (
    <>
      <div className="t-class-page">
        <aside className="t-class-list-panel">
          <div className="t-class-list-title">Danh sách lớp</div>
          <div className="t-class-list">
            {classes.map(cls => (
              <button
                key={cls.id}
                className={`t-class-list-item ${String(cls.id) === String(selectedClass.id) ? 'active' : ''}`}
                onClick={() => onSelect(cls.id)}
              >
                <span className="t-class-list-name">{cls.name}</span>
                <span className={`t-type-badge ${cls.type}`}>{cls.type === 'vip' ? 'Chính thức' : 'Trải nghiệm'}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="t-class-detail">
          <div className="t-class-detail-head">
            <div>
              <div className="t-class-eyebrow">{selectedClass.type === 'vip' ? 'Lớp chính thức' : 'Lớp trải nghiệm'}</div>
              <h2 className="t-class-detail-title">{selectedClass.name}</h2>
            </div>
            <span className={`t-type-badge ${selectedClass.type}`}>{selectedClass.type === 'vip' ? 'Chính thức' : 'Trải nghiệm'}</span>
          </div>

          <div className="t-class-stats">
            <div className="t-class-stat">
              <span>Học viên</span>
              <strong>{selectedClass.student_count ?? 0}</strong>
            </div>
            <div className="t-class-stat">
              <span>Buổi đã dạy</span>
              <strong>{selectedClass.session_count ?? 0}</strong>
            </div>
            <div className="t-class-stat">
              <span>Tổng buổi</span>
              <strong>{selectedClass.total_sessions || 10}</strong>
            </div>
          </div>

          <div className="t-class-info-grid">
            <div className="t-class-info-block">
              <label>Lịch học trong tuần</label>
              <div className="t-schedule-list">
                {schedules.map(schedule => (
                  <span className="t-schedule-chip" key={schedule.schedule_id}>
                    {scheduleLabel(schedule)}
                  </span>
                ))}
              </div>
            </div>

            <div className="t-class-info-block">
              <label>Link lớp học</label>
              {selectedClass.class_link ? (
                <a
                  className="t-class-link"
                  href={getClassLinkHref(selectedClass.class_link)}
                  target="_blank"
                  rel="noreferrer"
                  title={selectedClass.class_link}
                >
                  Vào lớp học
                </a>
              ) : (
                <span className="t-muted">Chưa có link</span>
              )}
            </div>

            <div className="t-class-info-block full">
              <label>Mô tả</label>
              <div className="t-class-description">
                {selectedClass.description || 'Chưa có mô tả'}
              </div>
            </div>
          </div>

          <div className="t-class-actions">
            <button className="t-btn-attendance" onClick={() => setShowAttendance(true)}>
              Điểm danh
            </button>
            <button className="t-btn-cancel-class" onClick={() => setShowModal(true)}>
              Xin nghỉ
            </button>
          </div>
        </section>
      </div>

      {showAttendance && (
        <AttendanceModal
          cls={selectedClass}
          onClose={() => setShowAttendance(false)}
          onSaved={onCancelRequest}
        />
      )}

      {showModal && (
        <LeaveRequestModal
          cls={selectedClass}
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
  const [selectedClassId, setSelectedClassId] = useState(null);

  const titleMap = { vip: 'Lịch dạy lớp chính thức', trial: 'Lịch dạy lớp Trải nghiệm', all: 'Tất cả lớp học' };
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
  const displayClasses = useMemo(() => groupClassesById(classes), [classes]);
  useEffect(() => {
    if (displayClasses.length > 0 && !displayClasses.some(cls => String(cls.id) === String(selectedClassId))) {
      setSelectedClassId(displayClasses[0].id);
    }
  }, [displayClasses, selectedClassId]);

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
      ) : displayClasses.length === 0 ? (
        <div className="t-empty-state">
          <div className="t-empty-icon">📚</div>
          <div>Chưa có lớp học nào</div>
        </div>
      ) : (
        <ClassDetailPage
          classes={displayClasses}
          selectedId={selectedClassId}
          onSelect={setSelectedClassId}
          onCancelRequest={() => setRefreshKey(k => k + 1)}
        />
      )}
    </div>
  );
}
