import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import loginLogo from '../assets/login-logo.png';
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
      else if (user.role === 'admission') navigate('/admission');
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
    <main className="login-wrapper">
      <section className="login-panel" aria-label="Đăng nhập Kitty Academy">
        <div className="login-header">
          <img className="login-logo-img" src={loginLogo} alt="Kitty Academy" />
          <div className="login-brand">
            <span className="brand-name">Kitty Academy</span>
            <span className="brand-sub">Global Learning Community</span>
          </div>
        </div>

        <h1 className="login-title">Đăng nhập</h1>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="input-group">
            <span className="input-label">Tên tài khoản</span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="login-input"
            />
          </label>

          <label className="input-group">
            <span className="input-label">Mật khẩu</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="login-input"
            />
          </label>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" /> Đang đăng nhập...
              </span>
            ) : 'Đăng nhập'}
          </button>
        </form>

        <a href="#forgot" className="forgot-link">Bạn quên tài khoản hoặc mật khẩu?</a>

        <p className="cookie-note">Trình duyệt của bạn cần bật cookie để đăng nhập.</p>

        <footer className="login-footer">
          <p>Copyright (c) Kitty Academy Edtech Ltd, 2024 - 2026. All rights reserved.</p>
        </footer>
      </section>
    </main>
  );
}
