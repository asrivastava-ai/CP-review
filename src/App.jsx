import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LoginPage, RegisterPage, ForgotPasswordPage } from './pages/AuthPages';
import DashboardPage from './pages/DashboardPage';
import NewReviewPage from './pages/NewReviewPage';
import ReviewPage from './pages/ReviewPage';
import KnowledgePage from './pages/KnowledgePage';
import UsersPage from './pages/UsersPage';
import './styles/global.css';

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: "'Source Serif 4', serif",
              fontSize: '14px',
              background: '#1a2535',
              color: '#f5f0e8',
              border: '1px solid rgba(201,168,76,0.3)'
            },
            success: { iconTheme: { primary: '#c9a84c', secondary: '#1a2535' } },
            error: { iconTheme: { primary: '#c0392b', secondary: '#fff' } }
          }}
        />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/new-review" element={<PrivateRoute><NewReviewPage /></PrivateRoute>} />
          <Route path="/review/:id" element={<PrivateRoute><ReviewPage /></PrivateRoute>} />
          <Route path="/knowledge" element={<PrivateRoute><KnowledgePage /></PrivateRoute>} />
          <Route path="/users" element={<PrivateRoute><UsersPage /></PrivateRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
