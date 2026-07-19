import React from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Settings, LogOut, Menu, FileText, Plus } from 'lucide-react';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: FileText, label: 'Files', path: '/files' },
  { icon: LayoutDashboard, label: 'Tasks', path: '/tasks' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/landing');
  };

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 z-40 h-screen w-[220px] bg-bg-card border-r border-border flex flex-col shrink-0 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center font-bold text-sm text-white shrink-0">S</div>
          <span className="font-bold text-lg text-gray-900">SprintRoom</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-btn text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-brand-badge text-brand'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon size={18} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-badge text-brand flex items-center justify-center text-xs font-bold shrink-0">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.username}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all" title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/20 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-bg-card border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-btn text-gray-500 hover:text-gray-700 hover:bg-gray-100" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <button onClick={() => navigate('/join')} className="btn-primary text-xs py-2 px-4 gap-1.5">
              <Plus size={16} /> Join Room
            </button>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/settings" className="p-2 rounded-btn text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
              <Settings size={18} />
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
