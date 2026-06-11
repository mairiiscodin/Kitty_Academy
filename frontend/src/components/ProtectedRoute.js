import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', fontFamily: 'Nunito, sans-serif',
        background: '#f0f7f1', color: '#2d7a3a', fontSize: '16px'
      }}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'32px',marginBottom:'12px'}}>🌿</div>
          Đang tải...
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/login" replace />;

  return children;
};
