import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './Teacher.css';

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
  request_accepted: { icon: 'OK', color: '#2d7a3a', bg: '#e8f5e9', label: 'Được chấp nhận' },
  request_rejected: { icon: 'NO', color: '#c62828', bg: '#ffebee', label: 'Bị từ chối' },
  system: { icon: '!', color: '#1565c0', bg: '#e3f2fd', label: 'Thông báo' },
};

function NotificationCard({ notif }) {
  const cfg = TYPE_CONFIG[notif.type] || { icon: 'i', color: '#555', bg: '#f5f5f5', label: 'Thông báo' };

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
        {notif.sender_name && <div className="t-noti-sender">Người gửi: {notif.sender_name}</div>}
      </div>
    </div>
  );
}

export default function TeacherNotifications({ onRead }) {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchNotifications = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/teacher/notifications`);
      setNotifications(r.data.notifications || []);
      setUnread(r.data.unread || 0);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleReadAll = async () => {
    await axios.put(`${API}/teacher/notifications/read-all`).catch(() => {});
    fetchNotifications();
    onRead?.();
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
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
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      <div className="t-tabs">
        <button className={`t-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          Tất cả ({notifications.length})
        </button>
        <button className={`t-tab ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')}>
          Chưa đọc ({unread})
        </button>
      </div>

      {loading ? (
        <div className="t-loading">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="t-empty-state">
          <div className="t-empty-icon">!</div>
          <div>{filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}</div>
        </div>
      ) : (
        <div className="t-noti-list">
          {filtered.map(n => <NotificationCard key={n.id} notif={n} />)}
        </div>
      )}
    </div>
  );
}
