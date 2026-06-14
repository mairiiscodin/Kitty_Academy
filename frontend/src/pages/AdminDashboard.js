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
const Sidebar = ({ user, onLogout }) => {
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
              <NavLink to="/admin/register" className={({isActive}) => `nav-item ${isActive?'active':''}`}>
                <UserPlusIcon/> Đăng kí tài khoản
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
                <CrownIcon/> Quản lí lớp Vip
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
        <button className="footer-btn"><BellIcon/></button>
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
    {type === 'vip' ? 'VIP' : 'Trải nghiệm'}
  </Badge>
);

const StatusBadge = ({ val }) => (
  <Badge color={val ? '#2d7a3a' : '#999'}>{val ? 'Hoạt động' : 'Đã khóa'}</Badge>
);

const getClassLinkHref = (link) => {
  const trimmed = link?.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

// ---- Confirm Delete Modal ----
const ConfirmModal = ({ item, onConfirm, onCancel, loading }) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
    <div className="modal confirm-modal">
      <div className="confirm-icon">🗑️</div>
      <h3 className="confirm-title">Xác nhận xóa</h3>
      <p className="confirm-msg">
        Bạn có chắc muốn xóa lớp <strong>"{item?.name}"</strong>?<br/>
        <span className="confirm-warn">Hành động này không thể hoàn tác.</span>
      </p>
      <div className="confirm-btns">
        <button className="btn-secondary" onClick={onCancel}>Hủy bỏ</button>
        <button className="btn-danger" onClick={onConfirm} disabled={loading}>
          {loading ? 'Đang xóa...' : 'Xóa lớp'}
        </button>
      </div>
    </div>
  </div>
);

// ---- Class Form Modal (Thêm / Sửa) ----
const ClassFormModal = ({ mode, initial, teachers, onClose, onSave }) => {
  const DAYS = ['Chủ nhật','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7'];
  const emptyForm = { name:'', type:'vip', description:'', class_link:'', max_students:30, teacher_id:'', day_of_week:'1', start_time:'18:00', end_time:'18:45' };

  const [form, setForm] = useState(initial ? {
    name:         initial.name || '',
    type:         initial.type || 'vip',
    description:  initial.description || '',
    class_link:   initial.class_link || '',
    max_students: initial.max_students || 30,
    teacher_id:   initial.teacher_id || '',
    day_of_week:  String(initial.day_of_week ?? '1'),
    start_time:   initial.start_time?.substring(0,5) || '18:00',
    end_time:     initial.end_time?.substring(0,5) || '18:45',
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
  const maxSt = Number(form.max_students) || 30;

  // Load students
  useEffect(() => {
    setLoadingStudents(true);
    if (mode === 'add') {
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
  }, [mode, initial]);

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

  const filteredStudents = allStudents.filter(s =>
    s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.username.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.name.trim()) return setErr('Vui lòng nhập tên lớp');
    setLoading(true); setErr('');
    try {
      if (mode === 'add') {
        await axios.post(`${API}/admin/classes`, { ...form, student_ids: selectedIds });
      } else {
        await axios.put(`${API}/admin/classes/${initial.id}`, form);
        if (initial.schedule_id) {
          await axios.put(`${API}/admin/schedules/${initial.schedule_id}`, {
            day_of_week: form.day_of_week, start_time: form.start_time,
            end_time: form.end_time, teacher_id: form.teacher_id || initial.teacher_id,
          });
        }
        if (selectedIds.length > 0) {
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
          <h3 className="modal-title">{mode === 'add' ? '➕ Thêm lớp học mới' : '✏️ Sửa lớp học'}</h3>
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

            <div className="form-group">
              <label>Loại lớp</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="vip">VIP</option>
                <option value="trial">Trải nghiệm</option>
              </select>
            </div>

            <div className="form-group">
              <label>Sĩ số tối đa</label>
              <input type="number" min="1" max="100" value={form.max_students}
                onChange={e => set('max_students', e.target.value)} />
            </div>

            <div className="form-group full-col">
              <label>🔗 Link lớp học (Meet / Zoom / Teams...)</label>
              <input value={form.class_link}
                onChange={e => set('class_link', e.target.value)}
                placeholder="https://meet.google.com/xxx-xxxx-xxx" />
            </div>

            <div className="form-group full-col">
              <label>Giáo viên phụ trách</label>
              <select value={form.teacher_id} onChange={e => set('teacher_id', e.target.value)}>
                <option value="">— Chưa chọn —</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Ngày học trong tuần</label>
              <select value={form.day_of_week} onChange={e => set('day_of_week', e.target.value)}>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Giờ bắt đầu</label>
              <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
            </div>

            <div className="form-group">
              <label>Giờ kết thúc</label>
              <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
            </div>

            <div className="form-group full-col">
              <label>Mô tả</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Mô tả lớp học..." rows={2} />
            </div>
          </div>

          {/* ---- Học sinh ---- */}
          <div className="modal-section-title" style={{marginTop:20}}>
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
                      title="Xóa khỏi lớp"
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
            ) : filteredStudents.length === 0 ? (
              <div className="picker-empty">
                {studentSearch ? 'Không tìm thấy học sinh' : (mode === 'edit' ? 'Tất cả học sinh đã trong lớp' : 'Chưa có học sinh nào trong hệ thống')}
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
                        <div className="picker-username">@{s.username}</div>
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
          </div>
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
  const DAYS_SHORT = ['CN','T2','T3','T4','T5','T6','T7'];
  const title = type === 'vip' ? 'Quản lí lớp VIP' : 'Quản lí lớp Trải nghiệm';

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
                <th>Giáo viên</th>
                <th>Ngày học</th>
                <th>Giờ học</th>
                <th>Sĩ số tối đa</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="empty-row">
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
                  <td>{cls.teacher_name || <span className="td-empty">Chưa có</span>}</td>
                  <td>{cls.day_of_week != null ? DAYS_SHORT[cls.day_of_week] : '—'}</td>
                  <td className="td-time">
                    {cls.start_time ? `${cls.start_time.substring(0,5)} - ${cls.end_time?.substring(0,5)}` : '—'}
                  </td>
                  <td className="td-center">{cls.max_students}</td>
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
const TablePage = ({ title, fetchUrl, columns }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    axios.get(fetchUrl)
      .then(r => setData(Object.values(r.data).find(v => Array.isArray(v)) || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [fetchUrl]);

  const filtered = data.filter(row =>
    Object.values(row).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
  );

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
                <tr key={row.id || i}>
                  {columns.map(c => (
                    <td key={c.key}>{c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
        <StatCard label="Giáo viên"          value={stats.total_teachers} color="#1565C0" icon="👨‍🏫"/>
        <StatCard label="Học viên"           value={stats.total_students} color="#6A1B9A" icon="🎓"/>
        <StatCard label="Lớp VIP"            value={stats.vip_classes}    color="#E65100" icon="⭐"/>
        <StatCard label="Lớp Trải nghiệm"   value={stats.trial_classes}  color="#00838F" icon="📅"/>
        <StatCard label="Tổng lớp học"       value={stats.total_classes}  color="#2E7D32" icon="🏫"/>
      </div>
    )}
  </div>
);

// ================================================================
// REGISTER PAGE
// ================================================================
const RegisterPage = () => {
  const [form, setForm] = useState({ username:'', password:'', full_name:'', role:'student', email:'' });
  const [msg, setMsg]   = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true); setMsg(null);
    try {
      await axios.post(`${API}/admin/users`, form);
      setMsg({ type:'success', text:'Tạo tài khoản thành công!' });
      setForm({ username:'', password:'', full_name:'', role:'student', email:'' });
    } catch(err) {
      setMsg({ type:'error', text: err.response?.data?.message || 'Lỗi tạo tài khoản' });
    } finally { setLoading(false); }
  };

  return (
    <div className="page-content">
      <h1 className="page-title">Đăng kí tài khoản</h1>
      <div className="form-card">
        {msg && <div className={`form-msg ${msg.type}`}>{msg.text}</div>}
        <form onSubmit={handleSubmit} className="form-grid">
          {[
            { key:'username',  label:'Tên tài khoản *', placeholder:'Nhập username', required:true },
            { key:'full_name', label:'Họ và tên *',      placeholder:'Nhập họ tên',  required:true },
          ].map(f => (
            <div className="form-group" key={f.key}>
              <label>{f.label}</label>
              <input value={form[f.key]} placeholder={f.placeholder} required={f.required}
                onChange={e => setForm({...form, [f.key]: e.target.value})} />
            </div>
          ))}
          <div className="form-group">
            <label>Mật khẩu *</label>
            <input type="password" value={form.password} placeholder="Nhập mật khẩu" required
              onChange={e => setForm({...form, password: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} placeholder="Nhập email"
              onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Vai trò</label>
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="student">Học viên</option>
              <option value="teacher">Giáo viên</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="form-group full-width">
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
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

  useEffect(() => {
    axios.get(`${API}/admin/dashboard`).then(r => setStats(r.data.stats)).catch(()=>{});
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  const peopleCols = [
    { key:'id',         label:'#' },
    { key:'full_name',  label:'Họ tên' },
    { key:'username',   label:'Tài khoản' },
    { key:'email',      label:'Email' },
    { key:'is_active',  label:'Trạng thái', render: v => <StatusBadge val={v}/> },
    { key:'created_at', label:'Ngày tạo', render: v => v ? new Date(v).toLocaleDateString('vi-VN') : '—' },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar user={user} onLogout={handleLogout}/>
      <main className="main-content">
        <Routes>
          <Route path="/"              element={<AdminHome user={user} stats={stats}/>}/>
          <Route path="/register"      element={<RegisterPage/>}/>
          <Route path="/classes/vip"   element={<ClassesPage type="vip"/>}/>
          <Route path="/classes/trial" element={<ClassesPage type="trial"/>}/>
          <Route path="/teachers"      element={<TablePage title="Quản lí giáo viên"  fetchUrl={`${API}/admin/teachers`} columns={peopleCols}/>}/>
          <Route path="/students"      element={<TablePage title="Quản lí học viên"   fetchUrl={`${API}/admin/students`} columns={peopleCols}/>}/>
        </Routes>
      </main>
    </div>
  );
}
