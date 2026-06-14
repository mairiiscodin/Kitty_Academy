import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import loginLogo from '../assets/login-logo.png';
import loginBg from '../assets/login-bg.jpg';
import './Login.css';

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
      <section className="login-panel" aria-label="Đăng nhập Kitty Academy">
        <div className="login-box">
          <div className="login-header">
            <img className="login-logo-img" src={loginLogo} alt="Kitty Academy" />
            <div className="login-brand">
              <span className="brand-name">Kitty Academy</span>
              <span className="brand-sub">Global Learning Community</span>
            </div>
          </div>

          <div className="login-main">
            <h1 className="login-title">Đăng nhập</h1>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <span className="input-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
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
                <span className="input-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
                    <span className="spinner" /> Đang đăng nhập...
                  </span>
                ) : 'Đăng nhập'}
              </button>
            </form>

            <p className="cookie-note">
              Trình duyệt của bạn cần phải mở chức năng<br />
              quản lý cookie. <a href="#cookies">Thông báo từ các Cookies.</a>
            </p>
          </div>

          <footer className="login-footer">
            <p>Copyright (c) Kitty Academy Edtech Ltd, 2024 - 2026.<br />All rights reserved.</p>
            <div className="lang-switcher">🇬🇧 English</div>
          </footer>
        </div>
      </section>

      <section className="login-illustration" aria-hidden="true">
        <img className="login-bg-img" src={loginBg} alt="" />
      </section>
    </div>
  );
}
