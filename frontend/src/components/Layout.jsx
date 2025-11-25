import React, { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, FileText, BarChart3, LogOut, User, Menu, X, Shield, Settings as SettingsIcon, Calendar, Sliders } from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, testId: 'nav-dashboard' },
    { name: 'Month MIS', href: '/monthly-mis', icon: Calendar, testId: 'nav-monthly-mis' },
    { name: 'Loans', href: '/loans', icon: FileText, testId: 'nav-loans' },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, testId: 'nav-analytics' }
  ];

  // Add Scheme Management for everyone
  navigation.push({ name: 'Schemes', href: '/scheme-management', icon: FileText, testId: 'nav-scheme-management' });
  
  // Add User Management and Field Management for admins
  if (user?.role === 'admin') {
    navigation.push({ name: 'Users', href: '/users', icon: Shield, testId: 'nav-users' });
    navigation.push({ name: 'Statuses', href: '/status-management', icon: Flag, testId: 'nav-status-management' });
    navigation.push({ name: 'Field Config', href: '/field-management', icon: Sliders, testId: 'nav-field-management' });
  }
  
  // Add Settings for everyone
  navigation.push({ name: 'Settings', href: '/settings', icon: SettingsIcon, testId: 'nav-settings' });

  const isActive = (path) => location.pathname === path;

  const getRoleBadge = (role) => {
    const badges = {
      admin: { text: 'Admin', class: 'bg-purple-100 text-purple-700' },
      manager: { text: 'Manager', class: 'bg-blue-100 text-blue-700' },
      agent: { text: 'Agent', class: 'bg-green-100 text-green-700' }
    };
    const badge = badges[role] || badges.agent;
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.class}`}>{badge.text}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <img 
            src={process.env.REACT_APP_LOGO_URL} 
            alt="MHP Fintech Logo" 
            className="h-10 w-auto object-contain"
          />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-slate-100"
            data-testid="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed top-16 left-0 right-0 bg-white shadow-lg z-50" onClick={(e) => e.stopPropagation()}>
            <nav className="p-4 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                      isActive(item.href) 
                        ? 'bg-blue-50 text-blue-600 font-semibold' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    data-testid={item.testId}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-slate-200 p-4">
              <div className="flex items-center gap-3 mb-3 px-2">
                <div className="bg-blue-100 p-2 rounded-full">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate" data-testid="user-name">{user?.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500 truncate" data-testid="user-email">{user?.email}</p>
                    {getRoleBadge(user?.role)}
                  </div>
                </div>
              </div>
              <Button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                variant="outline"
                className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-50" data-testid="sidebar">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <img 
                src={process.env.REACT_APP_LOGO_URL} 
                alt="MHP Fintech Logo" 
                className="h-12 w-auto object-contain"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">Your Growth is our Vision</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all sidebar-link ${
                    isActive(item.href) ? 'active' : 'text-slate-700 hover:text-slate-900'
                  }`}
                  data-testid={item.testId}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-slate-200">
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="bg-blue-100 p-2 rounded-full">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate" data-testid="user-name">{user?.name}</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-500 truncate" data-testid="user-email">{user?.email}</p>
                  {getRoleBadge(user?.role)}
                </div>
              </div>
            </div>
            <Button
              onClick={logout}
              variant="outline"
              className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pt-16 lg:pt-0 lg:ml-64 min-h-screen flex flex-col">
        <div className="p-4 lg:p-8 flex-1">
          {children}
        </div>
        
        {/* Copyright Footer */}
        <footer className="border-t border-slate-200 bg-slate-50 py-4 px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-600">
            <p>© 2025 MHP Fintech Services Pvt Ltd. All rights reserved.</p>
            <p className="text-xs">Built with ❤️ for efficient loan management</p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Layout;