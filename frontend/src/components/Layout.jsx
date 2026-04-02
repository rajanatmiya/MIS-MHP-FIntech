import React, { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, FileText, BarChart3, LogOut, User, Menu, X, Shield, Settings as SettingsIcon, Calendar, Sliders, Flag, FolderOpen, Database } from 'lucide-react';

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

  navigation.push({ name: 'Schemes', href: '/scheme-management', icon: FileText, testId: 'nav-scheme-management' });
  navigation.push({ name: 'Master File', href: '/master-file', icon: FolderOpen, testId: 'nav-master-file' });
  
  if (user?.role === 'admin') {
    navigation.push({ name: 'Users', href: '/users', icon: Shield, testId: 'nav-users' });
    navigation.push({ name: 'Statuses', href: '/status-management', icon: Flag, testId: 'nav-status-management' });
    navigation.push({ name: 'Field Config', href: '/field-management', icon: Sliders, testId: 'nav-field-management' });
    navigation.push({ name: 'DB Backup', href: '/db-backup', icon: Database, testId: 'nav-db-backup' });
  }
  
  navigation.push({ name: 'Settings', href: '/settings', icon: SettingsIcon, testId: 'nav-settings' });

  const isActive = (path) => location.pathname === path;

  const getRoleBadge = (role) => {
    const badges = {
      admin: { text: 'Admin', class: 'bg-white/20 text-white' },
      manager: { text: 'Manager', class: 'bg-white/20 text-white' },
      agent: { text: 'Agent', class: 'bg-white/20 text-white' }
    };
    const badge = badges[role] || badges.agent;
    return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.class}`}>{badge.text}</span>;
  };

  const getMobileRoleBadge = (role) => {
    const badges = {
      admin: { text: 'Admin', class: 'bg-blue-100 text-blue-700' },
      manager: { text: 'Manager', class: 'bg-blue-100 text-blue-700' },
      agent: { text: 'Agent', class: 'bg-green-100 text-green-700' }
    };
    const badge = badges[role] || badges.agent;
    return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.class}`}>{badge.text}</span>;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-[#2c587a] z-50 px-4 py-2.5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src={process.env.REACT_APP_LOGO_URL} 
              alt="MHP Fintech" 
              className="h-8 w-auto object-contain rounded"
            />
            <span className="text-white font-semibold text-sm">MHP Fintech</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
            data-testid="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed top-[52px] left-0 right-0 bg-white shadow-lg z-50 max-h-[calc(100vh-52px)] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <nav className="p-3 space-y-0.5">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive(item.href) 
                        ? 'bg-blue-50 text-[#1e40af]' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                    data-testid={item.testId}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-slate-100 p-3">
              <div className="flex items-center gap-2.5 mb-2.5 px-2">
                <div className="bg-blue-100 p-1.5 rounded-full">
                  <User className="w-3.5 h-3.5 text-[#1e40af]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate" data-testid="user-name">{user?.name}</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] text-slate-500 truncate" data-testid="user-email">{user?.email}</p>
                    {getMobileRoleBadge(user?.role)}
                  </div>
                </div>
              </div>
              <Button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-8"
                data-testid="logout-button"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar - Blue Theme */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-56 bg-[#2c587a] z-50 shadow-xl" data-testid="sidebar">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-4 py-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <img 
                src={process.env.REACT_APP_LOGO_URL} 
                alt="MHP Fintech" 
                className="h-9 w-auto object-contain rounded"
              />
              <div>
                <p className="text-white font-semibold text-xs leading-tight">MHP Fintech</p>
                <p className="text-blue-200 text-[10px]">MIS Dashboard</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive(item.href) 
                      ? 'bg-white/20 text-white shadow-sm' 
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
                  data-testid={item.testId}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="px-3 py-3 border-t border-white/10">
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="bg-white/15 p-1.5 rounded-full">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate" data-testid="user-name">{user?.name}</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] text-blue-200 truncate" data-testid="user-email">{user?.email}</p>
                  {getRoleBadge(user?.role)}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-200 hover:text-white hover:bg-white/10 transition-all"
              data-testid="logout-button"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pt-[52px] lg:pt-0 lg:ml-56 min-h-screen flex flex-col">
        <div className="p-4 lg:p-6 flex-1">
          {children}
        </div>
        
        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-3 px-4 lg:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] text-slate-500">
            <p>© 2025 MHP Fintech Services Pvt Ltd. All rights reserved.</p>
            <p>Your Growth is our Vision</p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Layout;
