import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

const TYPE_CONFIG = {
  cancel_request:   { icon: '🔄', color: '#e65100', bg: '#fff3e0', label: 'Yêu cầu dạy thay' },
  request_accepted: { icon: '✅', color: '#2d7a3a', bg: '#e8f5e9', label: 'Được chấp nhận' },
  request_rejected: { icon: '❌', color: '#c62828', bg: '#ffebee', label: 'Bị từ chối' },
};

function NotificationCard({ notif, onRespond }) {
  const [loading, setLoading] = useState('');
  const cfg = TYPE_CONFIG[notif.type] || { icon: '🔔', color: '#555', bg: '#f5f5f5', label: 'Thông báo' };
  const isPending = notif.type === 'cancel_request' && notif.request_status === 'pending';

  const respond = async (action) => {
    setLoading(action);
    try {
      await axios.post(`${API}/teacher/cancel-request/${notif.cancel_request_id}/respond`, { action });
      await axios.put(`${API}/teacher/notifications/${notif.id}/read`);
      onRespond();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi xử lý');
    } finally { setLoading(''); }
  };

  return (
    <div className={`t-noti-card ${!notif.is_read ? 'unread' : ''}`}
      style={{ '--noti-bg': cfg.bg, '--noti-color': cfg.color }}>

      <div className="t-noti-icon-col">
        <div className="t-noti-type-icon" style={{ background: cfg.bg, color: cfg.color }}>
          {cfg.icon}
        </div>
        {!notif.is_read && <div className="t-noti-unread-dot"></div>}
      </div>

      <div className="t-noti-content">
        <div className="t-noti-header">
          <span className="t-noti-type-label" style={{ color: cfg.color, background: cfg.bg }}>
            {cfg.label}
          </span>
          <span className="t-noti-time">{timeAgo(notif.created_at)}</span>
        </div>

        <div className="t-noti-title">{notif.title}</div>
        <div className="t-noti-msg">{notif.message}</div>

        {notif.sender_name && (
          <div className="t-noti-sender">👤 {notif.sender_name}</div>
        )}

        {/* Action buttons nếu là cancel_request đang pending */}
        {isPending && (
          <div className="t-noti-actions">
            <button
              className="t-noti-btn accept"
              onClick={() => respond('accept')}
              disabled={!!loading}
            >
              {loading === 'accept' ? 'Đang xử lý...' : '✅ Đồng ý dạy thay'}
            </button>
            <button
              className="t-noti-btn reject"
              onClick={() => respond('reject')}
              disabled={!!loading}
            >
              {loading === 'reject' ? 'Đang xử lý...' : '❌ Từ chối'}
            </button>
          </div>
        )}

        {notif.type === 'cancel_request' && notif.request_status === 'accepted' && (
          <div className="t-noti-done accepted">✅ Bạn đã đồng ý dạy thay</div>
        )}
        {notif.type === 'cancel_request' && notif.request_status === 'rejected' && (
          <div className="t-noti-done rejected">❌ Bạn đã từ chối</div>
        )}
      </div>
    </div>
  );
}

export default function TeacherNotifications({ onRead }) {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'cancel_request'

  const fetchNotifications = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/teacher/notifications`);
      setNotifications(r.data.notifications || []);
      setUnread(r.data.unread || 0);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleReadAll = async () => {
    await axios.put(`${API}/teacher/notifications/read-all`).catch(() => {});
    fetchNotifications();
    onRead?.();
  };

  const handleRespond = () => {
    fetchNotifications();
    onRead?.();
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'cancel_request') return n.type === 'cancel_request';
    return true;
  });

  return (
    <div className="t-page">
      <div className="t-noti-page-header">
        <div>
          <h1 className="t-page-title">Thông báo</h1>
          <p className="t-page-sub">
            {unread > 0 ? `${unread} thông báo chưa đọc` : 'Tất cả đã đọc'}
          </p>
        </div>
        {unread > 0 && (
          <button className="t-btn-read-all" onClick={handleReadAll}>
            ✓ Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="t-tabs">
        <button className={`t-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          Tất cả ({notifications.length})
        </button>
        <button className={`t-tab ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')}>
          🔵 Chưa đọc ({unread})
        </button>
        <button className={`t-tab ${filter === 'cancel_request' ? 'active' : ''}`} onClick={() => setFilter('cancel_request')}>
          🔄 Yêu cầu dạy thay
        </button>
      </div>

      {loading ? (
        <div className="t-loading">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="t-empty-state">
          <div className="t-empty-icon">🔔</div>
          <div>{filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}</div>
        </div>
      ) : (
        <div className="t-noti-list">
          {filtered.map(n => (
            <NotificationCard key={n.id} notif={n} onRespond={handleRespond} />
          ))}
        </div>
      )}
    </div>
  );
}
