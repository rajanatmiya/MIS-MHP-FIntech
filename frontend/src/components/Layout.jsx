import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, FileText, BarChart3, LogOut, User } from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, testId: 'nav-dashboard' },
    { name: 'Loans', href: '/loans', icon: FileText, testId: 'nav-loans' },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, testId: 'nav-analytics' }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-50" data-testid="sidebar">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-2 rounded-lg shadow-md">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  LoanHub MIS
                </h1>
                <p className="text-xs text-slate-500">Loan Management</p>
              </div>
            </div>
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
                <p className="text-xs text-slate-500 truncate" data-testid="user-email">{user?.email}</p>
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
      <main className="ml-64 min-h-screen">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;