'use client';

import { useState, useEffect } from 'react';
import Homepage from './components/Homepage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import Dashboard from './components/Dashboard';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Client-side router for Figma Make preview
// In production, use Next.js App Router (see /app directory)

export default function App() {
  const [currentPath, setCurrentPath] = useState('/');

  useEffect(() => {
    // Handle browser back/forward
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Override Next.js Link behavior for preview
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      if (link && link.href && link.href.startsWith(window.location.origin)) {
        e.preventDefault();
        const path = link.href.replace(window.location.origin, '');
        setCurrentPath(path);
        window.history.pushState({}, '', path);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Render current page wrapped with AuthProvider
  return (
    <AuthProvider>
      {currentPath === '/login' && <LoginPage />}
      {currentPath === '/register' && <RegisterPage />}
      {currentPath === '/onboarding' && (
        <ProtectedRoute>
          <OnboardingFlow />
        </ProtectedRoute>
      )}
      {currentPath === '/dashboard' && (
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      )}
      {currentPath === '/' && <Homepage />}
    </AuthProvider>
  );
}
