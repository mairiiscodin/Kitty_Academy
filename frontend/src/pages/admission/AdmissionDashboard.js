import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import DBLogo from '../../assets/dashboard-logo.png';
import './AdmissionDashboard.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
);

const HomeIcon = () => <Icon d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10"/>;
const CrownIcon = () => <Icon d="M2 20h20 M4 20L6 10l6 5 6-5 2 10"/>;
const CalendarIcon = () => <Icon d="M8 2v4M16 2v4M3 8h18M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"/>;
const TeacherIcon = () => <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75"/>;
const StudentIcon = () => <Icon d="M22 10v6M2 10l10-5 10 5-10 5-10-5z M6 12v5c3 3 9 3 12 0v-5"/>;
const SettingsIcon = () => <Icon d="M12 20a8 8 0 100-16 8 8 0 000 16z M12 14a2 2 0 100-4 2 2 0 000 4z"/>;
const BellIcon = () => <Icon d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>;
const LogoutIcon = () => <Icon d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>;
const ChevronDown = () => <Icon d="M6 9l6 6 6-6" size={14}/>;
const SearchIcon = () => <Icon d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>;
const PlusIcon = () => <Icon d="M12 5v14M5 12h14"/>;
const EditIcon = () => <Icon d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
const TrashIcon = () => <Icon d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>;

const Badge = ({ color, children }) => <span className="badge" style={{ background: color }}>{children}</span>;
const TypeBadge = ({ type }) => <Badge color={type === 'vip' ? '#E65100' : '#00838F'}>{type === 'vip' ? 'VIP' : 'Trải nghiệm'}</Badge>;
const StatusBadge = ({ val }) => <Badge color={val ? '#2d7a3a' : '#999'}>{val ? 'Hoạt động' : 'Đã khóa'}</Badge>;

const getClassLinkHref = (link) => {
  const trimmed = link?.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const TrialClassFormModal = ({ mode, initial, teachers, onClose, onSave }) => {
  const DAYS = ['Chu nhat','Thu 2','Thu 3','Thu 4','Thu 5','Thu 6','Thu 7'];
  const [form, setForm] = useState(initial ? {
    name: initial.name || '',
    type: 'trial',
    trial_student_name: initial.trial_student_name || '',
    description: initial.description || '',
    class_link: initial.class_link || '',
    teacher_id: initial.teacher_id || '',
    day_of_week: String(initial.day_of_week ?? '1'),
    start_time: initial.start_time?.substring(0,5) || '18:00',
    end_time: initial.end_time?.substring(0,5) || '18:45',
  } : {
    name: '',
    type: 'trial',
    trial_student_name: '',
    description: '',
    class_link: '',
    teacher_id: '',
    day_of_week: '1',
    start_time: '18:00',
    end_time: '18:45',
  });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) return setErr('Vui lòng nhập tên lớp');
    if (!form.trial_student_name.trim()) return setErr('Vui lòng nhập tên học sinh');
    setLoading(true);
    setErr('');
    try {
      if (mode === 'add') {
        await axios.post(`${API}/admission/classes`, form);
      } else {
        await axios.put(`${API}/admission/classes/${initial.id}`, form);
      }
      onSave();
    } catch (e) {
      setErr(e.response?.data?.message || 'Lỗi lưu dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal class-modal">
        <div className="modal-header">
          <h3 className="modal-title">{mode === 'add' ? 'Thêm lớp trải nghiệm' : 'Sửa lớp trải nghiệm'}</h3>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        <div className="modal-body">
          {err && <div className="form-msg error">{err}</div>}
          <div className="form-grid-2">
            <div className="form-group full-col">
              <label>Tên lớp *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="VD: Demo English 01" />
            </div>
            <div className="form-group full-col">
              <label>Tên học sinh *</label>
              <input value={form.trial_student_name} onChange={e => set('trial_student_name', e.target.value)} placeholder="Nhập tên học sinh" />
            </div>
            <div className="form-group full-col">
              <label>Link lớp học</label>
              <input value={form.class_link} onChange={e => set('class_link', e.target.value)} placeholder="https://meet.google.com/xxx-xxxx-xxx" />
            </div>
            <div className="form-group full-col">
              <label>Giáo viên phụ trách</label>
              <select value={form.teacher_id} onChange={e => set('teacher_id', e.target.value)}>
                <option value="">Chưa chọn</option>
                {teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Ngày học</label>
              <select value={form.day_of_week} onChange={e => set('day_of_week', e.target.value)}>
                {DAYS.map((day, index) => <option key={index} value={index}>{day}</option>)}
              </select>
            </div>
            <br></br>
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
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Hủy</button>
          <button className="btn-primary" onClick={handleSave} disabled={loading}>{loading ? 'Đang lưu...' : 'Lưu'}</button>
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ user, onLogout }) => {
  const [expanded, setExpanded] = useState({ home: true, classes: true, teachers: true, students: true });
  const toggle = key => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <img className="dashboard-logo-img" src={DBLogo} alt="Kitty Academy" />
        <div>
          <div className="sidebar-brand">Kitty Academy</div>
          <div className="sidebar-brand-sub">Global Learning Community</div>
        </div>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">{user?.full_name?.charAt(0) || 'T'}</div>
        <div className="user-info">
          <div className="user-name">{user?.full_name}</div>
          <div className="user-role">Tư vấn tuyển sinh</div>
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
              <NavLink to="/admission" end className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
                <HomeIcon/> Trang chủ
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
              <NavLink to="/admission/classes/vip" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
                <CrownIcon/> Danh sách lớp VIP
              </NavLink>
              <NavLink to="/admission/classes/trial" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
                <CalendarIcon/> Quản lí lớp trải nghiệm
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
              <NavLink to="/admission/teachers" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
                <TeacherIcon/> Danh sách giáo viên
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
              <NavLink to="/admission/students" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
                <StudentIcon/> Danh sách học viên
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

const StatCard = ({ label, value, color, icon }) => (
  <div className="stat-card" style={{'--card-color': color}}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-value">{value ?? '-'}</div>
    <div className="stat-label">{label}</div>
  </div>
);

const AdmissionHome = ({ user, stats }) => (
  <div className="page-content">
    <h1 className="page-title">Bảng điều khiển - Tư vấn tuyển sinh</h1>
    <p className="page-subtitle">Chào mừng trở lại, {user?.full_name}!</p>
    {stats && (
      <div className="stats-grid">
        <StatCard label="Học viên" value={stats.total_students} color="#6A1B9A" icon="🎓"/>
        <StatCard label="Lớp VIP" value={stats.vip_classes} color="#E65100" icon="⭐"/>
        <StatCard label="Lớp trải nghiệm" value={stats.trial_classes} color="#00838F" icon="📅"/>
        <StatCard label="Tổng lớp học" value={stats.total_classes} color="#2E7D32" icon="🏫"/>
      </div>
    )}
  </div>
);

const ClassesPage = ({ type }) => {
  const DAYS_SHORT = ['CN','T2','T3','T4','T5','T6','T7'];
  const title = type === 'vip' ? 'Danh sách lớp VIP' : 'Quản lí lớp trải nghiệm';

  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admission/classes`);
      const filtered = (res.data.classes || []).filter(cls => cls.type === type);
      setClasses(filtered);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  useEffect(() => {
    axios.get(`${API}/admission/teachers`)
      .then(res => setTeachers(res.data.teachers || []))
      .catch(() => setTeachers([]));
  }, []);

  const handleSaved = () => {
    showToast(editItem ? 'Đã cập nhật lớp trải nghiệm' : 'Đã thêm lớp trải nghiệm');
    setShowForm(false);
    setEditItem(null);
    fetchClasses();
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await axios.delete(`${API}/admission/classes/${deleteItem.id}`);
      showToast('Đã xóa lớp trải nghiệm');
      setDeleteItem(null);
      fetchClasses();
    } catch (err) {
      showToast(err.response?.data?.message || 'Lỗi xóa lớp trải nghiệm', false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filtered = classes.filter(cls =>
    cls.name?.toLowerCase().includes(search.toLowerCase()) ||
    cls.teacher_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-content">
      {toast && <div className={`toast ${toast.ok ? 'toast-ok' : 'toast-err'}`}>{toast.msg}</div>}

      <div className="page-header-row">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{filtered.length} lớp</p>
        </div>
        {type === 'trial' && (
          <button className="btn-primary btn-add" onClick={() => { setEditItem(null); setShowForm(true); }}>
            <PlusIcon/> Thêm lớp trải nghiệm
          </button>
        )}
      </div>

      <div className="search-bar">
        <span className="search-icon"><SearchIcon/></span>
        <input
          placeholder="Tìm theo tên lớp, giáo viên..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

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
                <th>Giờ học</th>
                {type !== 'trial' && <th>Sĩ số</th>}
                {type !== 'trial' && <th>Điểm danh / Tổng buổi</th>}
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="empty-row">Chưa có dữ liệu</td></tr>
              ) : filtered.map((cls, index) => (
                <tr key={cls.id}>
                  <td className="td-num">{index + 1}</td>
                  <td><strong>{cls.name}</strong></td>
                  <td className="td-link">
                    {cls.class_link ? (
                      <a href={getClassLinkHref(cls.class_link)} target="_blank" rel="noreferrer" title={cls.class_link}>
                        {cls.class_link}
                      </a>
                    ) : <span className="td-empty">Chưa có</span>}
                  </td>
                  <td><TypeBadge type={cls.type}/></td>
                  {type === 'trial' && <td>{cls.trial_student_name || <span className="td-empty">Chưa có</span>}</td>}
                  <td>{cls.teacher_name || <span className="td-empty">Chưa có</span>}</td>
                  <td>{cls.day_of_week != null ? DAYS_SHORT[cls.day_of_week] : '-'}</td>
                  <td className="td-time">{cls.start_time ? `${cls.start_time.substring(0,5)} - ${cls.end_time?.substring(0,5)}` : '-'}</td>
                  {type !== 'trial' && <td className="td-center">{cls.student_count}</td>}
                  {type !== 'trial' && <td className="td-center">{cls.session_count ?? 0}/{cls.total_sessions || 10}</td>}
                  <td><StatusBadge val={cls.is_active}/></td>
                  <td>
                    {type === 'trial' ? (
                      <div className="action-btns">
                        <button className="action-btn edit" title="Sửa" onClick={() => { setEditItem(cls); setShowForm(true); }}>
                          <EditIcon/>
                        </button>
                        <button className="action-btn delete" title="Xóa" onClick={() => setDeleteItem(cls)}>
                          <TrashIcon/>
                        </button>
                      </div>
                    ) : (
                      <span className="admission-readonly">Chỉ xem</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <TrialClassFormModal
          mode={editItem ? 'edit' : 'add'}
          initial={editItem}
          teachers={teachers}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSave={handleSaved}
        />
      )}

      {deleteItem && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteItem(null)}>
          <div className="modal confirm-modal">
            <h3 className="confirm-title">Xác nhận xóa</h3>
            <p className="confirm-msg">Bạn có chắc muốn xóa lớp <strong>"{deleteItem.name}"</strong>?</p>
            <div className="confirm-btns">
              <button className="btn-secondary" onClick={() => setDeleteItem(null)}>Hủy</button>
              <button className="btn-danger" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? 'Đang xóa...' : 'Xóa lop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AddStudentModal = ({ onClose, onSaved }) => {
  const [fullName, setFullName] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) return setErr('Vui lòng nhập tên học viên');

    setLoading(true);
    setErr('');
    try {
      await axios.post(`${API}/admission/students`, { full_name: fullName.trim() });
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.message || 'Lỗi thêm học viên');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Thêm học viên</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {err && <div className="form-msg error">{err}</div>}
          <div className="form-group">
            <label>Tên học viên *</label>
            <input
              value={fullName}
              placeholder="Nhập tên học viên"
              onChange={e => setFullName(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Hủy</button>
          <button className="btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Đang thêm...' : 'Thêm học viên'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TablePage = ({ title, fetchUrl, columns, headerAction, refreshKey = 0 }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    axios.get(fetchUrl)
      .then(res => setData(Object.values(res.data).find(value => Array.isArray(value)) || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [fetchUrl, refreshKey]);

  const filtered = data.filter(row =>
    Object.values(row).some(value => String(value).toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="page-content">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{filtered.length} bản ghi</p>
        </div>
        {headerAction}
      </div>
      <div className="search-bar">
        <span className="search-icon"><SearchIcon/></span>
        <input placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} className="search-input" />
      </div>
      {loading ? (
        <div className="loading-state">Đang tải dữ liệu...</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr>{columns.map(col => <th key={col.key}>{col.label}</th>)}</tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={columns.length} className="empty-row">Chưa có dữ liệu</td></tr>
              ) : filtered.map((row, index) => (
                <tr key={row.id || index}>
                  {columns.map(col => (
                    <td key={col.key}>{col.render ? col.render(row[col.key], row, index) : (row[col.key] ?? '—')}</td>
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

const AdmissionStudentsPage = ({ columns }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toast, setToast] = useState('');

  const handleSaved = () => {
    setShowAdd(false);
    setRefreshKey(prev => prev + 1);
    setToast('Đã thêm học viên và gửi thông báo cho admin');
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <>
      {toast && <div className="toast toast-ok">{toast}</div>}
      <TablePage
        title="Danh sách học viên"
        fetchUrl={`${API}/admission/students`}
        columns={columns}
        refreshKey={refreshKey}
        headerAction={(
          <button className="btn-primary btn-add" onClick={() => setShowAdd(true)}>
            <PlusIcon/> Thêm học viên
          </button>
        )}
      />
      {showAdd && (
        <AddStudentModal
          onClose={() => setShowAdd(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
};

export default function AdmissionDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios.get(`${API}/admission/dashboard`).then(res => setStats(res.data.stats)).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const peopleCols = [
    { key: 'stt', label: 'STT', render: (_value, _row, index) => index + 1 },
    { key: 'full_name', label: 'Họ tên' },
    { key: 'username', label: 'Tài khoản' },
    { key: 'email', label: 'Email' },
    { key: 'is_active', label: 'Trạng thái', render: value => <StatusBadge val={value}/> },
    { key: 'created_at', label: 'Ngày tạo', render: value => value ? new Date(value).toLocaleDateString('vi-VN') : '—' },
  ];
  const studentCols = [
    { key: 'stt', label: 'STT', render: (_value, _row, index) => index + 1 },
    { key: 'full_name', label: 'Họ tên' },
    { key: 'username', label: 'Tài khoản' },
    { key: 'email', label: 'Email' },
    { key: 'class_names', label: 'Mã lớp', render: value => value || <span className="td-empty">Chưa có lớp</span> },
    { key: 'is_active', label: 'Trạng thái', render: value => <StatusBadge val={value}/> },
    { key: 'created_at', label: 'Ngày tạo', render: value => value ? new Date(value).toLocaleDateString('vi-VN') : '—' },
  ];

  return (
    <div className="dashboard-layout">
      <Sidebar user={user} onLogout={handleLogout}/>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<AdmissionHome user={user} stats={stats}/>}/>
          <Route path="/classes/vip" element={<ClassesPage type="vip"/>}/>
          <Route path="/classes/trial" element={<ClassesPage type="trial"/>}/>
          <Route path="/teachers" element={<TablePage title="Danh sách giáo viên" fetchUrl={`${API}/admission/teachers`} columns={peopleCols}/>}/>
          <Route path="/students" element={<AdmissionStudentsPage columns={studentCols}/>}/>
        </Routes>
      </main>
    </div>
  );
}
