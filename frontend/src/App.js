import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Loans from '@/pages/Loans';
import AnalyticsEnhanced from '@/pages/AnalyticsEnhanced';
import MonthlyMIS from '@/pages/MonthlyMIS';
import UserManagement from '@/pages/UserManagement';
import FieldManagement from '@/pages/FieldManagement';
import SchemeManagement from '@/pages/SchemeManagement';
import StatusManagement from '@/pages/StatusManagement';
import Settings from '@/pages/Settings';
import MasterFile from '@/pages/MasterFile';
import DBBackup from '@/pages/DBBackup';
import AgentOnboarding from '@/pages/AgentOnboarding';
import Layout from '@/components/Layout';

const RoleGuard = ({ children, allowed, user }) => {
  if (!allowed.includes(user?.role)) {
    const defaultPath = user?.role === 'agent' ? '/monthly-mis' : '/';
    return <Navigate to={defaultPath} replace />;
  }
  return children;
};
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const AuthContext = React.createContext();

// PWA Install Prompt Component
const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast.success('App installed successfully!');
    }
    
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 md:left-auto md:right-3 md:w-80 bg-white rounded-lg shadow-xl border border-slate-200 p-3 z-50 animate-in slide-in-from-bottom duration-300">
      <button
        onClick={() => setShowInstall(false)}
        className="absolute top-2 right-2 p-0.5 hover:bg-slate-100 rounded"
        data-testid="install-dismiss-btn"
      >
        <X className="w-3.5 h-3.5 text-slate-400" />
      </button>
      
      <div className="flex items-start gap-2.5">
        <div className="bg-blue-50 p-1.5 rounded-lg">
          <Download className="w-4 h-4 text-[#1e40af]" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-800 text-xs mb-0.5">Install MHP Fintech</h3>
          <p className="text-[11px] text-slate-500 mb-2">Quick access and offline use</p>
          <div className="flex gap-2">
            <Button
              onClick={handleInstall}
              className="flex-1 bg-[#1e40af] hover:bg-[#1d4ed8] text-[11px] h-7"
              size="sm"
              data-testid="install-app-btn"
            >
              Install
            </Button>
            <Button
              onClick={() => setShowInstall(false)}
              variant="outline"
              size="sm"
              className="text-[11px] h-7"
              data-testid="install-later-btn"
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(() => console.log('Service Worker registered'))
        .catch((err) => console.log('Service Worker registration failed:', err));
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route
            path="/*"
            element={
              user ? (
                <Layout>
                  <Routes>
                    <Route path="/" element={
                      user?.role === 'agent' ? <Navigate to="/monthly-mis" replace /> : <Dashboard />
                    } />
                    <Route path="/monthly-mis" element={<MonthlyMIS />} />
                    <Route path="/loans" element={<Loans />} />
                    <Route path="/analytics" element={
                      <RoleGuard allowed={['admin', 'manager']} user={user}><AnalyticsEnhanced /></RoleGuard>
                    } />
                    <Route path="/users" element={
                      <RoleGuard allowed={['admin']} user={user}><UserManagement /></RoleGuard>
                    } />
                    <Route path="/field-management" element={
                      <RoleGuard allowed={['admin']} user={user}><FieldManagement /></RoleGuard>
                    } />
                    <Route path="/scheme-management" element={
                      <RoleGuard allowed={['admin']} user={user}><SchemeManagement /></RoleGuard>
                    } />
                    <Route path="/status-management" element={
                      <RoleGuard allowed={['admin']} user={user}><StatusManagement /></RoleGuard>
                    } />
                    <Route path="/settings" element={
                      <RoleGuard allowed={['admin']} user={user}><Settings /></RoleGuard>
                    } />
                    <Route path="/master-file" element={
                      <RoleGuard allowed={['admin']} user={user}><MasterFile /></RoleGuard>
                    } />
                    <Route path="/db-backup" element={
                      <RoleGuard allowed={['admin']} user={user}><DBBackup /></RoleGuard>
                    } />
                    <Route path="/onboarding" element={
                      <RoleGuard allowed={['admin', 'manager']} user={user}><AgentOnboarding /></RoleGuard>
                    } />
                    <Route path="*" element={
                      <Navigate to={user?.role === 'agent' ? '/monthly-mis' : '/'} replace />
                    } />
                  </Routes>
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
      <InstallPrompt />
    </AuthContext.Provider>
  );
}

export default App;