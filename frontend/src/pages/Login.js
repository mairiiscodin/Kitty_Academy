import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const KittyLogo = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
    <polygon points="24,4 44,14 44,34 24,44 4,34 4,14" fill="#2d7a3a" opacity="0.15"/>
    <polygon points="24,8 40,17 40,31 24,40 8,31 8,17" fill="#2d7a3a" opacity="0.3"/>
    <text x="24" y="30" textAnchor="middle" fontSize="20" fontWeight="bold" fill="#2d7a3a" fontFamily="serif">K</text>
  </svg>
);

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username, password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'teacher') navigate('/teacher');
      else if (user.role === 'student') navigate('/student');
      else navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      {/* Left panel */}
      <div className="login-panel">
        <div className="login-box">
          {/* Logo */}
          <div className="login-logo">
            <div className="logo-icon"></div>
            <div className="login-brand">
              <span className="brand-name">Kitty Academy</span>
              <span className="brand-sub">Global Learning Community</span>
            </div>
          </div>

          <h2 className="login-title">Đăng nhập</h2>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <span className="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              <input
                type="text"
                placeholder="Tên tài khoản"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="login-input"
              />
            </div>

            <div className="input-group">
              <span className="input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                type="password"
                placeholder="Mật khẩu"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="login-input"
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <a href="#forgot" className="forgot-link">Bạn quên tài khoản hoặc mật khẩu?</a>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner"></span> Đang đăng nhập...
                </span>
              ) : 'Đăng nhập'}
            </button>
          </form>

          <p className="cookie-note">
            Trình duyệt của bạn cần phải mở chức năng quản lý cookie.{' '}
            <a href="#cookies">Thông báo từ các Cookies.</a>
          </p>

          <div className="login-footer">
            <p>Copyright (c) Kitty Academy Edtech Ltd, 2024 - 2026.<br/>All rights reserved.</p>
            <div className="lang-switcher">
              <span>🇬🇧 English</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - illustration */}
      <div className="login-illustration">
      </div>
    </div>
  );
}
