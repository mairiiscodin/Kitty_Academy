import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Routes, Route, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import './AdminDashboard.css';
import DBLogo from '../assets/dashboard-logo.png';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ================================================================
// ICONS
// ================================================================
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
);
const HomeIcon     = () => <Icon d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10"/>;
const UserPlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
    <line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/>
  </svg>
);
const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const CrownIcon    = () => <Icon d="M2 20h20 M4 20L6 10l6 5 6-5 2 10"/>;
const CalendarIcon = () => <Icon d="M8 2v4M16 2v4M3 8h18M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"/>;
const TeacherIcon  = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const StudentIcon  = () => <Icon d="M22 10v6M2 10l10-5 10 5-10 5-10-5z M6 12v5c3 3 9 3 12 0v-5"/>;
const SettingsIcon = () => <Icon d="M12 20a8 8 0 100-16 8 8 0 000 16z M12 14a2 2 0 100-4 2 2 0 000 4z"/>;
const BellIcon     = () => <Icon d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>;
const LogoutIcon   = () => <Icon d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>;
const ChevronDown  = () => <Icon d="M6 9l6 6 6-6" size={14}/>;
const PlusIcon     = () => <Icon d="M12 5v14M5 12h14"/>;
const EditIcon     = () => <Icon d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
const TrashIcon    = () => <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>;
const SearchIcon   = () => <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>;

// ================================================================
// SIDEBAR
// ================================================================
const Sidebar = ({ user, unread, onLogout }) => {
  const [expanded, setExpanded] = useState({ home: true, classes: true, teachers: true, students: true });
  const toggle = k => setExpanded(p => ({ ...p, [k]: !p[k] }));

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <img className="dashboard-logo-img" src={DBLogo} alt="Kitty Academy" />
        <div>
          <div className="sidebar-brand">Kitty Academy</div>
          <div className="sidebar-brand-sub">—Global Learning Community</div>
        </div>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">{user?.full_name?.charAt(0) || 'A'}</div>
        <div className="user-info">
          <div className="user-name">{user?.full_name}</div>
          <div className="user-role">Admin</div>
          <div className="user-status"><span className="status-dot"></span>Online</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          <button className="nav-section-header" onClick={() => toggle('home')}>
            <span>TRANG CHỦ</span><ChevronDown/>
          </button>
          {expanded.home && (
            <div className="nav-items">
              <NavLink to="/admin" end className={({isActive}) => `nav-item ${isActive?'active':''}`}>
                <HomeIcon/> Trang chủ
              </NavLink>
              <NavLink to="/admin/accounts" className={({isActive}) => `nav-item ${isActive?'active':''}`}>
                <UsersIcon/> Quản lý tài khoản
              </NavLink>
            </div>
          )}
        </div>

        <div className="nav-section">
          <button className="nav-section-header" onClick={() => toggle('classes')}>
            <span>LỚP HỌC</span><ChevronDown/>
          </button>
          {expanded.classes && (
            <div className="nav-items">
              <NavLink to="/admin/classes/vip" className={({isActive}) => `nav-item ${isActive?'active':''}`}>
                <CrownIcon/> Quản lí lớp chính thức
              </NavLink>
              <NavLink to="/admin/classes/trial" className={({isActive}) => `nav-item ${isActive?'active':''}`}>
                <CalendarIcon/> Quản lí lớp Trải nghiệm
              </NavLink>
            </div>
          )}
        </div>

        <div className="nav-section">
          <button className="nav-section-header" onClick={() => toggle('teachers')}>
            <span>GIÁO VIÊN</span><ChevronDown/>
          </button>
          {expanded.teachers && (
            <div className="nav-items">
              <NavLink to="/admin/teachers" className={({isActive}) => `nav-item ${isActive?'active':''}`}>
                <TeacherIcon/> Quản lí giáo viên
              </NavLink>
            </div>
          )}
        </div>

        <div className="nav-section">
          <button className="nav-section-header" onClick={() => toggle('students')}>
            <span>HỌC VIÊN</span><ChevronDown/>
          </button>
          {expanded.students && (
            <div className="nav-items">
              <NavLink to="/admin/students" className={({isActive}) => `nav-item ${isActive?'active':''}`}>
                <StudentIcon/> Quản lí học viên
              </NavLink>
            </div>
          )}
        </div>
      </nav>

      <div className="sidebar-footer">
        <button className="footer-btn"><SettingsIcon/></button>
        <NavLink to="/admin/notifications" className="footer-btn bell-wrap" title="Thông báo">
          <BellIcon/>
          {unread > 0 && <span className="admin-badge">{unread > 9 ? '9+' : unread}</span>}
        </NavLink>
        <button className="footer-btn logout" onClick={onLogout}><LogoutIcon/></button>
      </div>
    </div>
  );
};

// ================================================================
// SHARED COMPONENTS
// ================================================================
const Badge = ({ color, children }) => (
  <span className="badge" style={{ background: color }}>{children}</span>
);

const TypeBadge = ({ type }) => (
  <Badge color={type === 'vip' ? '#E65100' : '#00838F'}>
    {type === 'vip' ? 'Chính thức' : 'Trải nghiệm'}
  </Badge>
);

const StatusBadge = ({ val }) => (
  <Badge color={val ? '#2d7a3a' : '#999'}>{val ? 'Hoạt động' : 'Đã khóa'}</Badge>
);

const ClassStatusBadge = ({ hasClass }) => (
  <Badge color={hasClass ? '#2d7a3a' : '#E65100'}>{hasClass ? 'Có lớp' : 'Chưa có lớp'}</Badge>
);

const getClassLinkHref = (link) => {
  const trimmed = link?.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const timeValue = (value) => String(value || '').substring(0, 5);

const schedulesOverlap = (a, b) => (
  String(a.day_of_week) === String(b.day_of_week) &&
  timeValue(a.start_time) < timeValue(b.end_time) &&
  timeValue(a.end_time) > timeValue(b.start_time)
);

const teacherMatchesSchedules = (teacher, schedules, excludeClassId = null) => {
  const busySchedules = (teacher.schedules || []).filter(schedule => (
    !excludeClassId || Number(schedule.class_id) !== Number(excludeClassId)
  ));

  return schedules.every(schedule => (
    schedule.day_of_week != null &&
    schedule.start_time &&
    schedule.end_time &&
    !busySchedules.some(busy => schedulesOverlap(schedule, busy))
  ));
};

const availabilityMatchesSchedules = (person, schedules) => {
  const availability = person.availability || [];
  if (availability.length === 0 || schedules.length === 0) return false;
  return schedules.every(schedule => availability.some(slot => (
    String(slot.day_of_week) === String(schedule.day_of_week) &&
    timeValue(slot.start_time) === timeValue(schedule.start_time) &&
    timeValue(slot.end_time) === timeValue(schedule.end_time)
  )));
};

const availabilityText = (person) => {
  const availability = person.availability || [];
  if (availability.length === 0) return 'Chưa đăng ký lịch';
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return availability
    .map(slot => `${days[Number(slot.day_of_week)]} ${timeValue(slot.start_time)}-${timeValue(slot.end_time)}`)
    .join(', ');
};

const DAYS_FULL = ['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];
const DAYS_SHORT = ['CN','T2','T3','T4','T5','T6','T7'];
const formatTime = (value) => timeValue(value) || '—';
const formatDate = (value) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
const formatScheduleChip = (schedule) => (
  `${DAYS_SHORT[Number(schedule.day_of_week)] || '—'} ${formatTime(schedule.start_time)} - ${formatTime(schedule.end_time)}`
);
const formatClassSize = (cls) => `${cls.student_count ?? 0}/${cls.max_students || 30}`;
const dayColumns = [1, 2, 3, 4, 5, 6, 0];
const timeSlots = [
  { key: '18:00', label: '18:00 - 18:45', start: '18:00', end: '18:45' },
  { key: '18:45', label: '18:45 - 19:30', start: '18:45', end: '19:30' },
  { key: '19:30', label: '19:30 - 20:15', start: '19:30', end: '20:15' },
  { key: '20:15', label: '20:15 - 21:00', start: '20:15', end: '21:00' },
];

const getSlotSchedules = (schedules, day, slot) => schedules.filter(schedule => (
  Number(schedule.day_of_week) === Number(day) &&
  timeValue(schedule.start_time) < slot.end &&
  timeValue(schedule.end_time) > slot.start
));

// ---- Confirm Delete Modal ----
const ConfirmModal = ({ item, onConfirm, onCancel, loading, title = 'Xác nhận xóa', message, confirmText = 'Xóa lớp' }) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
    <div className="modal confirm-modal">
      <div className="confirm-icon"></div>
      <h3 className="confirm-title">{title}</h3>
      <p className="confirm-msg">
        {message || <>Bạn có chắc muốn xóa lớp <strong>"{item?.name}"</strong>?</>}<br/>
        <span className="confirm-warn">Hành động này không thể hoàn tác.</span>
      </p>
      <div className="confirm-btns">
        <button className="btn-secondary" onClick={onCancel}>Hủy bỏ</button>
        <button className="btn-danger" onClick={onConfirm} disabled={loading}>
          {loading ? 'Đang xóa...' : confirmText}
        </button>
      </div>
    </div>
  </div>
);

// ---- Class Form Modal (Thêm / Sửa) ----
const ClassFormModal = ({ mode, initial, teachers, onClose, onSave }) => {
  const DAYS = ['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];
  const defaultSchedule = { day_of_week:'1', start_time:'18:00', end_time:'18:45' };
  const initialSchedules = initial?.schedules?.length
    ? initial.schedules.map(s => ({
      day_of_week: String(s.day_of_week ?? '1'),
      start_time: s.start_time?.substring(0,5) || '18:00',
      end_time: s.end_time?.substring(0,5) || '18:45',
    }))
    : (initial?.day_of_week != null ? [{
      day_of_week: String(initial.day_of_week),
      start_time: initial.start_time?.substring(0,5) || '18:00',
      end_time: initial.end_time?.substring(0,5) || '18:45',
    }] : []);
  const emptyForm = { name:'', type:'vip', description:'', trial_student_name:'', class_link:'', max_students:30, total_sessions:10, teacher_id:'', schedules: [] };

  const [form, setForm] = useState(initial ? {
    name:         initial.name || '',
    type:         initial.type || 'vip',
    description:  initial.description || '',
    trial_student_name: initial.trial_student_name || '',
    class_link:   initial.class_link || '',
    max_students: initial.max_students || 30,
    total_sessions: initial.total_sessions || 10,
    teacher_id:   initial.teacher_id || '',
    schedules:    initialSchedules,
  } : emptyForm);

  // Student picker state
  const [allStudents, setAllStudents]     = useState([]);
  const [selectedIds, setSelectedIds]     = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  // Existing students (edit mode)
  const [existingStudents, setExistingStudents] = useState([]);
  const [removingId, setRemovingId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setSchedule = (index, key, value) => {
    setForm(prev => ({
      ...prev,
      schedules: prev.schedules.map((schedule, i) => (
        i === index ? { ...schedule, [key]: value } : schedule
      )),
    }));
  };
  const setScheduleSlot = (index, slotKey) => {
    const slot = timeSlots.find(item => item.key === slotKey) || timeSlots[0];
    setForm(prev => ({
      ...prev,
      schedules: prev.schedules.map((schedule, i) => (
        i === index ? { ...schedule, start_time: slot.start, end_time: slot.end } : schedule
      )),
    }));
  };
  const addSchedule = () => {
    setForm(prev => ({
      ...prev,
      schedules: [...prev.schedules, defaultSchedule],
    }));
  };
  const removeSchedule = (index) => {
    setForm(prev => ({
      ...prev,
      schedules: prev.schedules.length > 1
        ? prev.schedules.filter((_, i) => i !== index)
        : prev.schedules,
    }));
  };
  const maxSt = Number(form.max_students) || 30;
  const isTrial = form.type === 'trial';
  const hasChosenSchedule = form.schedules.length > 0 && form.schedules.every(schedule => (
    schedule.day_of_week != null && schedule.start_time && schedule.end_time
  ));
  const availableTeachers = !hasChosenSchedule ? [] : teachers
    .filter(teacher => teacherMatchesSchedules(teacher, form.schedules, mode === 'edit' ? initial?.id : null))
    .filter(teacher => availabilityMatchesSchedules(teacher, form.schedules));

  useEffect(() => {
    if (form.teacher_id && !availableTeachers.some(teacher => String(teacher.id) === String(form.teacher_id))) {
      set('teacher_id', '');
    }
  }, [availableTeachers, form.teacher_id]);

  useEffect(() => {
    setSelectedIds(prev => prev.filter(id => {
      const student = allStudents.find(item => Number(item.id) === Number(id));
      return student && hasChosenSchedule && availabilityMatchesSchedules(student, form.schedules);
    }));
  }, [allStudents, form.schedules, hasChosenSchedule]);

  // Load students
  useEffect(() => {
    setLoadingStudents(true);
    if (isTrial) {
      setAllStudents([]);
      setExistingStudents([]);
      setLoadingStudents(false);
    } else if (mode === 'add') {
      axios.get(`${API}/admin/students/all`)
        .then(r => setAllStudents(r.data.students || []))
        .catch(() => setAllStudents([]))
        .finally(() => setLoadingStudents(false));
    } else {
      // Edit: load existing + available
      Promise.all([
        axios.get(`${API}/admin/classes/${initial.id}/students`),
        axios.get(`${API}/admin/classes/${initial.id}/available-students`),
      ]).then(([ex, av]) => {
        setExistingStudents(ex.data.students || []);
        setAllStudents(av.data.students || []);
      }).catch(() => {}).finally(() => setLoadingStudents(false));
    }
  }, [mode, initial, isTrial]);

  const toggleStudent = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      const currentTotal = mode === 'edit' ? existingStudents.length + prev.length : prev.length;
      if (currentTotal >= maxSt) { setErr(`Đã đạt sĩ số tối đa (${maxSt})`); return prev; }
      setErr('');
      return [...prev, id];
    });
  };

  const handleRemoveExisting = async (studentId) => {
    setRemovingId(studentId);
    try {
      await axios.delete(`${API}/admin/classes/${initial.id}/students/${studentId}`);
      setExistingStudents(prev => prev.filter(s => s.id !== studentId));
      // Add back to available list
      const removed = existingStudents.find(s => s.id === studentId);
      if (removed) setAllStudents(prev => [...prev, removed].sort((a,b) => a.full_name.localeCompare(b.full_name)));
    } catch { setErr('Lỗi xóa học sinh'); }
    finally { setRemovingId(null); }
  };

  const filteredStudents = !hasChosenSchedule ? [] : allStudents
    .filter(s =>
      s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.username.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(studentSearch.toLowerCase())
    )
    .filter(s => availabilityMatchesSchedules(s, form.schedules));

  const handleSave = async () => {
    if (!form.name.trim()) return setErr('Vui lòng nhập tên lớp');
    if (isTrial && !form.trial_student_name.trim()) return setErr('Vui lòng nhập tên học sinh học thử');
    if (form.schedules.length === 0) return setErr('Vui lòng chọn lịch học trước khi tạo lớp');
    if (!form.teacher_id) return setErr('Vui lòng chọn giáo viên phù hợp lịch học');
    for (const schedule of form.schedules) {
      if (!schedule.start_time || !schedule.end_time) return setErr('Vui lòng nhập đủ giờ học');
      if (schedule.start_time >= schedule.end_time) return setErr('Giờ kết thúc phải lớn hơn giờ bắt đầu');
    }
    for (let i = 0; i < form.schedules.length; i++) {
      for (let j = i + 1; j < form.schedules.length; j++) {
        const a = form.schedules[i];
        const b = form.schedules[j];
        if (a.day_of_week === b.day_of_week && a.start_time < b.end_time && a.end_time > b.start_time) {
          return setErr('Các buổi học trong cùng lớp bị trùng giờ');
        }
      }
    }
    setLoading(true); setErr('');
    try {
      const payload = {
        ...form,
        schedules: form.teacher_id ? form.schedules : [],
      };
      if (mode === 'add') {
        await axios.post(`${API}/admin/classes`, { ...payload, student_ids: isTrial ? [] : selectedIds });
      } else {
        await axios.put(`${API}/admin/classes/${initial.id}`, payload);
        if (!isTrial && selectedIds.length > 0) {
          await axios.post(`${API}/admin/classes/${initial.id}/enroll`, { student_ids: selectedIds });
        }
      }
      onSave();
    } catch (e) {
      setErr(e.response?.data?.message || 'Lỗi lưu dữ liệu');
    } finally { setLoading(false); }
  };

  const currentTotal = mode === 'edit'
    ? existingStudents.length + selectedIds.length
    : selectedIds.length;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal class-modal">
        <div className="modal-header">
          <h3 className="modal-title">{mode === 'add' ? 'Thêm lớp học mới' : 'Sửa lớp học'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {err && <div className="form-msg error">{err}</div>}

          {/* ---- Thông tin lớp ---- */}
          <div className="modal-section-title">📋 Thông tin lớp</div>
          <div className="form-grid-2">
            <div className="form-group full-col">
              <label>Tên lớp *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="VD: GD_ENG_001" />
            </div>
 
            {isTrial && (
              <div className="form-group full-col">
                <label>Tên học sinh học thử *</label>
                <input
                  value={form.trial_student_name}
                  onChange={e => set('trial_student_name', e.target.value)}
                  placeholder="Nhập tên học sinh"
                />
              </div>
            )}

            <div className="form-group">
              <label>Loại lớp</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="vip">Chính thức</option>
                <option value="trial">Trải nghiệm</option>
              </select>
            </div>

            <div className="form-group" style={{ display: isTrial ? 'none' : undefined }}>
              <label>Sĩ số tối đa</label>
              <input type="number" min="1" max="100" value={form.max_students}
                onChange={e => set('max_students', e.target.value)} />
            </div>

            <div className="form-group" style={{ display: isTrial ? 'none' : undefined }}>
              <label>Tổng số buổi học</label>
              <input type="number" min="1" max="100" value={form.total_sessions}
                onChange={e => set('total_sessions', e.target.value)} />
            </div>

            <div className="form-group full-col">
              <label>🔗 Link lớp học (Meet / Zoom / Teams...)</label>
              <input value={form.class_link}
                onChange={e => set('class_link', e.target.value)}
                placeholder="https://meet.google.com/xxx-xxxx-xxx" />
            </div>

            <div className="form-group full-col">
              <div className="schedule-header">
                <label>Lịch học trong tuần</label>
                <button type="button" className="mini-add-btn" onClick={addSchedule}>+ Thêm buổi</button>
              </div>
              <div className="schedule-list">
                {form.schedules.length === 0 && (
                  <div className="schedule-empty">Chưa chọn lịch học. Bấm "Thêm buổi" để chọn giờ trước.</div>
                )}
                {form.schedules.map((schedule, index) => (
                  <div className="schedule-row" key={index}>
                    <select value={schedule.day_of_week} onChange={e => setSchedule(index, 'day_of_week', e.target.value)}>
                      {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                    <select value={timeValue(schedule.start_time)} onChange={e => setScheduleSlot(index, e.target.value)}>
                      {timeSlots.map(slot => (
                        <option key={slot.key} value={slot.key}>{slot.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="schedule-remove"
                      onClick={() => removeSchedule(index)}
                      title="Xóa buổi học"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group full-col">
              <label>Giáo viên phụ trách</label>
              <select value={form.teacher_id} onChange={e => set('teacher_id', e.target.value)}>
                <option value="">— {hasChosenSchedule ? 'Chọn giáo viên phù hợp lịch học' : 'Chọn lịch học trước'} —</option>
                {availableTeachers.map(t => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
              {!hasChosenSchedule ? (
                <small className="form-hint">Chọn lịch học trước để hệ thống hiện giáo viên phù hợp.</small>
              ) : availableTeachers.length === 0 && (
                <small className="form-hint">Không có giáo viên phù hợp lịch đăng ký này.</small>
              )}
            </div>

            <div className="form-group full-col">
              <label>Mô tả</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Mô tả lớp học..." rows={2} />
            </div>
          </div>

          {/* ---- Học sinh ---- */}
          {!isTrial && (<><div className="modal-section-title" style={{marginTop:20}}>
            👥 Học sinh
            <span className="student-count-chip">
              {currentTotal} / {maxSt}
            </span>
          </div>

          {/* Existing students (edit mode) */}
          {mode === 'edit' && existingStudents.length > 0 && (
            <div className="existing-students">
              <div className="existing-label">Đang trong lớp</div>
              <div className="existing-list">
                {existingStudents.map(s => (
                  <div key={s.id} className="existing-chip">
                    <span className="existing-chip-name">{s.full_name}</span>
                    <button
                      className="existing-chip-remove"
                      onClick={() => handleRemoveExisting(s.id)}
                      disabled={removingId === s.id}
                      title="Xóa khọi lớp"
                    >
                      {removingId === s.id ? '...' : '×'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search + pick students */}
          <div className="student-picker">
            <div className="student-picker-search">
              <span className="search-icon"><SearchIcon /></span>
              <input
                className="search-input"
                placeholder="Tìm học sinh theo tên, username..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
              />
            </div>

            {loadingStudents ? (
              <div className="picker-loading">Đang tải danh sách học sinh...</div>
            ) : !hasChosenSchedule ? (
              <div className="picker-empty">Chọn lịch học trước để hiện học sinh phù hợp.</div>
            ) : filteredStudents.length === 0 ? (
              <div className="picker-empty">
                {studentSearch ? 'Không tìm thấy học sinh phù hợp' : 'Không có học sinh phù hợp lịch đăng ký này'}
              </div>
            ) : (
              <div className="picker-list">
                {filteredStudents.map(s => {
                  const checked = selectedIds.includes(s.id);
                  const disabled = !checked && currentTotal >= maxSt;
                  return (
                    <div
                      key={s.id}
                      className={`picker-item ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}
                      onClick={() => !disabled && toggleStudent(s.id)}
                    >
                      <div className={`picker-checkbox ${checked ? 'checked' : ''}`}>
                        {checked && '✓'}
                      </div>
                      <div className="picker-avatar">{s.full_name.charAt(0)}</div>
                      <div className="picker-info">
                        <div className="picker-name">{s.full_name}</div>
                        <div className="picker-phone">SĐT: {s.email || 'Chưa có'}</div>
                        <div className="picker-username">
                          @{s.username} · {availabilityText(s)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedIds.length > 0 && (
              <div className="picker-selected-summary">
                ✓ Đã chọn thêm {selectedIds.length} học sinh
                <button className="picker-clear" onClick={() => setSelectedIds([])}>Bỏ chọn tất cả</button>
              </div>
            )}
          </div></>)}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Hủy</button>
          <button className="btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Đang lưu...' : (mode === 'add' ? 'Thêm lớp' : 'Lưu thay đổi')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ================================================================
// CLASSES PAGE (CRUD)
// ================================================================
const ClassesPage = ({ type }) => {
  const title = type === 'vip' ? 'Quản lí lớp chính thức' : 'Quản lí lớp Trải nghiệm';

  const [classes, setClasses]     = useState([]);
  const [teachers, setTeachers]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState(null);   // null = add mode
  const [deleteItem, setDeleteItem] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [toast, setToast]         = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/admin/classes`);
      const all = r.data.classes || [];
      setClasses(all.filter(c => c.type === type));
    } catch { setClasses([]); }
    finally { setLoading(false); }
  }, [type]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  useEffect(() => {
    axios.get(`${API}/admin/teachers`)
      .then(r => setTeachers(r.data.teachers || []))
      .catch(() => setTeachers([]));
  }, []);

  const handleDelete = async () => {
    setDelLoading(true);
    try {
      await axios.delete(`${API}/admin/classes/${deleteItem.id}`);
      showToast('Đã xóa lớp học thành công');
      setDeleteItem(null);
      fetchClasses();
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi xóa lớp', false);
    } finally { setDelLoading(false); }
  };

  const handleSaved = () => {
    showToast(editItem ? 'Cập nhật lớp học thành công' : 'Thêm lớp học thành công');
    setShowForm(false);
    setEditItem(null);
    fetchClasses();
  };

  const filtered = classes.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.teacher_name?.toLowerCase().includes(search.toLowerCase())
  );
  const getSchedules = (cls) => (
    cls.schedules?.length
      ? cls.schedules
      : (cls.day_of_week != null ? [{ day_of_week: cls.day_of_week, start_time: cls.start_time, end_time: cls.end_time }] : [])
  );

  return (
    <div className="page-content">
      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.ok ? 'toast-ok' : 'toast-err'}`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">
            {filtered.length} lớp {type === 'vip' ? '(học sinh đã đăng ký chính thức)' : '(học sinh học thử)'}
          </p>
        </div>
        <button className="btn-primary btn-add" onClick={() => { setEditItem(null); setShowForm(true); }}>
          <PlusIcon/> Thêm lớp mới
        </button>
      </div>

      {/* Search */}
      <div className="search-bar">
        <span className="search-icon"><SearchIcon/></span>
        <input
          placeholder="Tìm theo tên lớp, giáo viên..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-state">Đang tải dữ liệu...</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tên lớp</th>
                <th>Link lớp học</th>
                <th>Loại</th>
                {type === 'trial' && <th>Tên học sinh</th>}
                <th>Giáo viên</th>
                <th>Ngày học</th>
                {type !== 'trial' && <th>Sĩ số</th>}
                {type !== 'trial' && <th>Điểm danh / Tổng buổi</th>}
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={type === 'trial' ? 9 : 10} className="empty-row">
                  {search ? 'Không tìm thấy lớp nào' : 'Chưa có lớp học nào'}
                </td></tr>
              ) : filtered.map((cls, i) => (
                <tr key={cls.id}>
                  <td className="td-num">{i + 1}</td>
                  <td><strong>{cls.name}</strong></td>
                  <td className="td-link">
                    {cls.class_link ? (
                      <a href={getClassLinkHref(cls.class_link)} target="_blank" rel="noreferrer" title={cls.class_link}>
                        {cls.class_link}
                      </a>
                    ) : (
                      <span className="td-empty">Chưa có</span>
                    )}
                  </td>
                  <td><TypeBadge type={cls.type}/></td>
                  {type === 'trial' && <td>{cls.trial_student_name || <span className="td-empty">Chưa có</span>}</td>}
                  <td>{cls.teacher_name || <span className="td-empty">Chưa có</span>}</td>
                  <td className="td-time td-schedules">
                    {getSchedules(cls).length > 0 ? getSchedules(cls).map((schedule, idx) => (
                      <span key={idx} className="schedule-chip">
                        {formatScheduleChip(schedule)}
                      </span>
                    )) : '—'}
                  </td>
                  {type !== 'trial' && <td className="td-center">{formatClassSize(cls)}</td>}
                  {type !== 'trial' && <td className="td-center">{cls.session_count ?? 0}/{cls.total_sessions || 10}</td>}
                  <td><StatusBadge val={cls.is_active}/></td>
                  <td>
                    <div className="action-btns">
                      <button className="action-btn edit" title="Sửa"
                        onClick={() => { setEditItem(cls); setShowForm(true); }}>
                        <EditIcon/>
                      </button>
                      <button className="action-btn delete" title="Xóa"
                        onClick={() => setDeleteItem(cls)}>
                        <TrashIcon/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <ClassFormModal
          mode={editItem ? 'edit' : 'add'}
          initial={editItem}
          teachers={teachers}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSave={handleSaved}
        />
      )}

      {deleteItem && (
        <ConfirmModal
          item={deleteItem}
          loading={delLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
        />
      )}
    </div>
  );
};

// ================================================================
// SIMPLE TABLE PAGE (giáo viên, học viên)
// ================================================================
const DetailModal = ({ type, item, onClose }) => {
  const schedules = item?.schedules || [];
  const isTeacher = type === 'teacher';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal detail-modal">
        <div className="modal-header">
          <h3 className="modal-title">{isTeacher ? 'Chi tiết giáo viên' : 'Chi tiết học viên'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="detail-profile">
            <div className="detail-avatar">{item.full_name?.charAt(0) || '?'}</div>
            <div>
              <h2>{item.full_name}</h2>
              <div className="detail-muted">@{item.username || '—'}</div>
            </div>
            <StatusBadge val={item.is_active}/>
          </div>

          <div className="detail-grid">
            <div><label>Số điện thoại</label><span>{item.email || '—'}</span></div>
            <div><label>Ngày tạo</label><span>{formatDate(item.created_at)}</span></div>
            {!isTeacher && <div><label>Lớp</label><span>{item.class_names || 'Chưa có lớp'}</span></div>}
          </div>

          <div className="detail-section-title">{isTeacher ? 'Lịch dạy' : 'Lịch học'}</div>
          {schedules.length === 0 ? (
            <div className="empty-row detail-empty">{isTeacher ? 'Chưa có lịch dạy' : 'Chưa có lịch học'}</div>
          ) : isTeacher ? (
            <div className="teacher-timetable-wrap">
              <table className="teacher-timetable">
                <thead>
                  <tr>
                    <th>Khung giờ</th>
                    {dayColumns.map(day => <th key={day}>{DAYS_FULL[day]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map(slot => (
                    <tr key={slot.key}>
                      <th>{slot.label}</th>
                      {dayColumns.map(day => {
                        const slotSchedules = getSlotSchedules(schedules, day, slot);
                        return (
                          <td key={`${slot.key}-${day}`}>
                            {slotSchedules.length === 0 ? (
                              <span className="timetable-empty">—</span>
                            ) : slotSchedules.map(schedule => (
                              <div className="timetable-item" key={schedule.schedule_id || schedule.id}>
                                <strong>{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</strong>
                                <span>{schedule.class_name || '—'}</span>
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="detail-table-wrap">
              <table className="data-table detail-table">
                <thead>
                  <tr>
                    <th>Thứ</th>
                    <th>Thời gian</th>
                    <th>Lớp</th>
                    {!isTeacher && <th>Giáo viên</th>}
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule, index) => (
                    <tr key={schedule.schedule_id || schedule.id || index}>
                      <td>{DAYS_FULL[schedule.day_of_week] || '—'}</td>
                      <td>{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</td>
                      <td>{schedule.class_name || '—'}</td>
                      {!isTeacher && <td>{schedule.teacher_name || '—'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TablePage = ({ title, fetchUrl, columns, detailType, enableClassFilter = false }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axios.get(fetchUrl)
      .then(r => setData(Object.values(r.data).find(v => Array.isArray(v)) || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [fetchUrl]);

  const filtered = data.filter(row => {
    const matchesSearch = Object.values(row).some(v => String(v).toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;
    if (!enableClassFilter || classFilter === 'all') return true;

    const hasClass = Boolean(row.class_names);
    return classFilter === 'has-class' ? hasClass : !hasClass;
  });

  return (
    <div className="page-content">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{filtered.length} bản ghi</p>
        </div>
      </div>
      <div className="search-bar">
        <span className="search-icon"><SearchIcon/></span>
        <input placeholder="Tìm kiếm..." value={search}
          onChange={e => setSearch(e.target.value)} className="search-input" />
      </div>
      {enableClassFilter && (
        <div className="filter-tabs" aria-label="Lọc học viên theo lớp">
          <button className={classFilter === 'all' ? 'active' : ''} onClick={() => setClassFilter('all')}>Tất cả</button>
          <button className={classFilter === 'has-class' ? 'active' : ''} onClick={() => setClassFilter('has-class')}>Có lớp</button>
          <button className={classFilter === 'no-class' ? 'active' : ''} onClick={() => setClassFilter('no-class')}>Chưa có lớp</button>
        </div>
      )}
      {loading ? (
        <div className="loading-state">Đang tải dữ liệu...</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={columns.length} className="empty-row">Chưa có dữ liệu</td></tr>
              ) : filtered.map((row, i) => (
                <tr
                  key={row.id || i}
                  className={detailType ? 'clickable-row' : undefined}
                  onClick={() => detailType && setSelected(row)}
                >
                  {columns.map(c => (
                    <td key={c.key}>{c.render ? c.render(row[c.key], row, i) : (row[c.key] ?? '—')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && <DetailModal type={detailType} item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

// ================================================================
// HOME + STATS
// ================================================================
const StatCard = ({ label, value, color, icon }) => (
  <div className="stat-card" style={{'--card-color': color}}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-value">{value ?? '—'}</div>
    <div className="stat-label">{label}</div>
  </div>
);

const AdminHome = ({ user, stats }) => (
  <div className="page-content">
    <h1 className="page-title">Bảng điều khiển - Admin</h1>
    <p className="page-subtitle">Chào mừng trở lại làm việc, {user?.full_name}! 👋</p>
    {stats && (
      <div className="stats-grid">
        <StatCard label="Tổng tài khoản"    value={stats.total_users}    color="#2d7a3a" icon="👤"/>
        <StatCard label="Giáo viên"          value={stats.total_teachers} color="#1565C0" icon="GV"/>
        <StatCard label="Học viên"           value={stats.total_students} color="#6A1B9A" icon="🎓"/>
        <StatCard label="Lớp chính thức"            value={stats.vip_classes}    color="#E65100" icon="⭐"/>
        <StatCard label="Lớp Trải nghiệm"   value={stats.trial_classes}  color="#00838F" icon="📅"/>
        <StatCard label="Tổng lớp học"       value={stats.total_classes}  color="#2E7D32" icon="⭐"/>
      </div>
    )}
  </div>
);

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
};

const AdminNotifications = ({ onRead }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/admin/notifications`);
      setNotifications(r.data.notifications || []);
      setUnread(r.data.unread || 0);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = async (id) => {
    await axios.put(`${API}/admin/notifications/${id}/read`).catch(() => {});
    fetchNotifications();
    onRead?.();
  };

  const readAll = async () => {
    await axios.put(`${API}/admin/notifications/read-all`).catch(() => {});
    fetchNotifications();
    onRead?.();
  };

  const openCreateClass = async (notificationId) => {
    await axios.put(`${API}/admin/notifications/${notificationId}/read`).catch(() => {});
    onRead?.();
    navigate('/admin/classes/vip');
  };

  return (
    <div className="page-content">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Thông báo</h1>
          <p className="page-subtitle">{unread > 0 ? `${unread} thông báo chưa đọc` : 'Tất cả đã đọc'}</p>
        </div>
        {unread > 0 && (
          <button className="btn-primary" onClick={readAll}>Đánh dấu đã đọc</button>
        )}
      </div>

      {loading ? (
        <div className="loading-state">Đang tải thông báo...</div>
      ) : notifications.length === 0 ? (
        <div className="loading-state">Chưa có thông báo nào</div>
      ) : (
        <div className="admin-noti-list">
          {notifications.map(n => (
            <button
              key={n.id}
              className={`admin-noti-card ${!n.is_read ? 'unread' : ''}`}
              onClick={() => !n.is_read && markRead(n.id)}
            >
              <div className="admin-noti-head">
                <strong>{n.title}</strong>
                <span>{timeAgo(n.created_at)}</span>
              </div>
              <div className="admin-noti-message">{n.message}</div>
              {n.sender_name && <div className="admin-noti-sender">Người gửi: {n.sender_name}</div>}
              {(n.title || '').includes('đăng ký') && (
                <div className="admin-noti-actions" onClick={e => e.stopPropagation()}>
                  <button type="button" className="btn-primary" onClick={() => openCreateClass(n.id)}>
                    Tạo lớp
                  </button>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ================================================================
// ACCOUNT MANAGEMENT PAGE
// ================================================================
const roleLabels = {
  admin: 'Admin',
  admission: 'Tư vấn tuyển sinh',
  teacher: 'Giáo viên',
  student: 'Học viên',
};

const RoleBadge = ({ role }) => (
  <Badge color={{
    admin: '#6A1B9A',
    admission: '#00838F',
    teacher: '#1565C0',
    student: '#2d7a3a',
  }[role] || '#777'}>
    {roleLabels[role] || role || '—'}
  </Badge>
);

const AccountFormModal = ({ mode, initial, onClose, onSave }) => {
  const [form, setForm] = useState({
    username: initial?.username || '',
    password: initial?.password || '',
    full_name: initial?.full_name || '',
    role: initial?.role || 'student',
    email: initial?.email || '',
    is_active: initial?.is_active ?? true,
  });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.username.trim()) return setErr('Vui lòng nhập tên tài khoản');
    if (!form.full_name.trim()) return setErr('Vui lòng nhập họ tên');
    if (mode === 'add' && !form.password.trim()) return setErr('Vui lòng nhập mật khẩu');

    setLoading(true);
    setErr('');
    try {
      const payload = {
        username: form.username.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        role: form.role,
        email: form.email.trim() || null,
        is_active: Boolean(form.is_active),
      };

      if (mode === 'add') {
        await axios.post(`${API}/admin/users`, payload);
      } else {
        await axios.put(`${API}/admin/users/${initial.id}`, payload);
      }
      onSave();
    } catch (e) {
      setErr(e.response?.data?.message || 'Lỗi lưu tài khoản');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal account-modal">
        <div className="modal-header">
          <h3 className="modal-title">{mode === 'add' ? 'Thêm tài khoản' : 'Sửa tài khoản'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {err && <div className="form-msg error">{err}</div>}
          <div className="form-grid-2">
            <div className="form-group">
              <label>Tên tài khoản *</label>
              <input value={form.username} placeholder="Nhập username" onChange={e => set('username', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Họ và tên *</label>
              <input value={form.full_name} placeholder="Nhập họ tên" onChange={e => set('full_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label>{mode === 'add' ? 'Mật khẩu *' : 'Mật khẩu'}</label>
              <input
                type="text"
                value={form.password}
                placeholder="Nhập mật khẩu"
                onChange={e => set('password', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Số điện thoại</label>
              <input type="tel" value={form.email || ''} placeholder="Nhập số điện thoại" onChange={e => set('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Vai trò</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="student">Học viên</option>
                <option value="teacher">Giáo viên</option>
                <option value="admission">Tư vấn tuyển sinh</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label>Trạng thái</label>
              <select value={form.is_active ? '1' : '0'} onChange={e => set('is_active', e.target.value === '1')}>
                <option value="1">Hoạt động</option>
                <option value="0">Đã khóa</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Hủy</button>
          <button className="btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Đang lưu...' : (mode === 'add' ? 'Thêm tài khoản' : 'Lưu thay đổi')}
          </button>
        </div>
      </div>
    </div>
  );
};

const AccountManagementPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/admin/users`);
      setAccounts(r.data.users || []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleSaved = () => {
    showToast(editItem ? 'Cập nhật tài khoản thành công' : 'Thêm tài khoản thành công');
    setShowForm(false);
    setEditItem(null);
    fetchAccounts();
  };

  const handleDelete = async () => {
    setDelLoading(true);
    try {
      await axios.delete(`${API}/admin/users/${deleteItem.id}`);
      showToast('Đã xóa tài khoản');
      setDeleteItem(null);
      fetchAccounts();
    } catch (e) {
      showToast(e.response?.data?.message || 'Lỗi xóa tài khoản', false);
    } finally {
      setDelLoading(false);
    }
  };

  const keyword = search.trim().toLowerCase();
  const filtered = accounts.filter(acc => {
    if (!keyword) return true;
    return (
      acc.full_name?.toLowerCase().includes(keyword) ||
      acc.username?.toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="page-content">
      {toast && <div className={`toast ${toast.ok ? 'toast-ok' : 'toast-err'}`}>{toast.msg}</div>}

      <div className="page-header-row">
        <div>
          <h1 className="page-title">Quản lý tài khoản</h1>
          <p className="page-subtitle">{filtered.length} tài khoản</p>
        </div>
        <button className="btn-primary btn-add" onClick={() => { setEditItem(null); setShowForm(true); }}>
          <UserPlusIcon/> Thêm tài khoản
        </button>
      </div>

      <div className="search-bar">
        <span className="search-icon"><SearchIcon/></span>
        <input
          placeholder="Tìm tài khoản theo tên hoặc username..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading-state">Đang tải danh sách tài khoản...</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Họ tên</th>
                <th>Tài khoản</th>
                <th>Mật khẩu</th>
                <th>Số điện thoại</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="empty-row">{search ? 'Không tìm thấy tài khoản' : 'Chưa có tài khoản'}</td></tr>
              ) : filtered.map((acc, i) => (
                <tr key={acc.id}>
                  <td className="td-num">{i + 1}</td>
                  <td><strong>{acc.full_name}</strong></td>
                  <td>@{acc.username}</td>
                  <td className="td-password">{acc.password || <span className="td-empty">Chưa có</span>}</td>
                  <td>{acc.email || <span className="td-empty">Chưa có</span>}</td>
                  <td><RoleBadge role={acc.role}/></td>
                  <td><StatusBadge val={acc.is_active}/></td>
                  <td>{acc.created_at ? new Date(acc.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                  <td>
                    <div className="action-btns">
                      <button className="action-btn edit" title="Sửa" onClick={() => { setEditItem(acc); setShowForm(true); }}>
                        <EditIcon/>
                      </button>
                      <button className="action-btn delete" title="Xóa" onClick={() => setDeleteItem(acc)}>
                        <TrashIcon/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <AccountFormModal
          mode={editItem ? 'edit' : 'add'}
          initial={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSave={handleSaved}
        />
      )}

      {deleteItem && (
        <ConfirmModal
          item={deleteItem}
          title="Xác nhận xóa tài khoản"
          message={<>Bạn có chắc muốn xóa vĩnh viễn tài khoản <strong>"{deleteItem.full_name}"</strong>?</>}
          confirmText="Xóa tài khoản"
          loading={delLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
        />
      )}
    </div>
  );
};

// ================================================================
// MAIN
// ================================================================
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    axios.get(`${API}/admin/dashboard`).then(r => setStats(r.data.stats)).catch(()=>{});
  }, []);

  const fetchUnread = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/admin/notifications`);
      setUnread(r.data.unread || 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchUnread();
    const t = setInterval(fetchUnread, 30000);
    return () => clearInterval(t);
  }, [fetchUnread]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const peopleCols = [
    { key:'stt',        label:'STT', render: (_v, _row, i) => i + 1 },
    { key:'full_name',  label:'Họ tên' },
    { key:'username',   label:'Tài khoản' },
    { key:'email',      label:'Số điện thoại' },
    { key:'is_active',  label:'Trạng thái', render: v => <StatusBadge val={v}/> },
    { key:'created_at', label:'Ngày tạo', render: v => v ? new Date(v).toLocaleDateString('vi-VN') : '—' },
  ];
  const studentCols = [
    { key:'stt',         label:'STT', render: (_v, _row, i) => i + 1 },
    { key:'full_name',   label:'Họ tên' },
    { key:'username',    label:'Tài khoản' },
    { key:'email',       label:'Số điện thoại' },
    { key:'class_names', label:'Mã lớp', render: v => v || <span className="td-empty">Chưa có lớp</span> },
    { key:'class_status', label:'Trạng thái', render: (_v, row) => <ClassStatusBadge hasClass={Boolean(row.class_names)}/> },
    { key:'created_at',  label:'Ngày tạo', render: v => v ? new Date(v).toLocaleDateString('vi-VN') : '—' },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar user={user} unread={unread} onLogout={handleLogout}/>
      <main className="main-content">
        <Routes>
          <Route path="/"              element={<AdminHome user={user} stats={stats}/>}/>
          <Route path="/notifications" element={<AdminNotifications onRead={fetchUnread}/>}/>
          <Route path="/accounts"      element={<AccountManagementPage/>}/>
          <Route path="/register"      element={<AccountManagementPage/>}/>
          <Route path="/classes/vip"   element={<ClassesPage type="vip"/>}/>
          <Route path="/classes/trial" element={<ClassesPage type="trial"/>}/>
          <Route path="/teachers"      element={<TablePage title="Quản lí giáo viên"  fetchUrl={`${API}/admin/teachers`} columns={peopleCols} detailType="teacher"/>}/>
          <Route path="/students"      element={<TablePage title="Quản lí học viên"   fetchUrl={`${API}/admin/students`} columns={studentCols} detailType="student" enableClassFilter/>}/>
        </Routes>
      </main>
    </div>
  );
}
