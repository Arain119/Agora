import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut, Key, BarChart3, Database, Users, Box, Cpu, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

export const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/', icon: BarChart3 },
    { name: 'API Tokens', path: '/tokens', icon: Key },
    { name: 'Models', path: '/models', icon: Box },
    { name: 'Request Logs', path: '/logs', icon: Database },
  ];

  if (user.role === 'ADMIN') {
    navItems.push(
      { name: 'Upstreams', path: '/admin/upstreams', icon: Cpu },
      { name: 'Users', path: '/admin/users', icon: Users },
      { name: 'Global Logs', path: '/admin/logs', icon: Database }
    );
  }

  const toggleMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col md:flex-row text-text-primary overflow-x-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-brand-dark text-white border-b-4 border-text-primary z-50 rounded-b-geometric">
        <div className="flex items-center gap-2">
          <div className="bg-brand p-2 rounded-geometric shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
            <h1 className="text-xl font-display font-black uppercase tracking-tighter mix-blend-screen text-bg-primary">Agora</h1>
          </div>
        </div>
        <button onClick={toggleMenu} className="p-2 border-2 border-white rounded-xl active:bg-white/20">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:static inset-0 z-40 bg-brand-dark text-white md:min-h-screen flex flex-col transition-transform duration-300 ease-out md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:w-72 border-r-4 border-text-primary rounded-r-geometric md:rounded-r-geometric-lg md:rounded-none md:shadow-solid
      `}>
        {/* Close button on mobile inside menu */}
        <div className="md:hidden flex justify-end p-4 border-b-2 border-white/10">
          <button onClick={toggleMenu} className="p-2 rounded-full hover:bg-white/10"><X size={24} /></button>
        </div>

        <div className="hidden md:block p-8 border-b-4 border-text-primary bg-brand rounded-tr-geometric-lg">
          <div className="inline-block bg-white p-3 rounded-geometric-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-[-2deg]">
            <h1 className="text-4xl font-display font-black uppercase tracking-tighter text-brand">Agora</h1>
          </div>
          <p className="text-sm font-sans uppercase font-bold tracking-widest mt-4 text-text-primary bg-brand-accent inline-block px-3 py-1 rounded-full border-2 border-text-primary shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">NVIDIA Gateway</p>
        </div>

        <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMenu}
                className={`flex items-center space-x-3 px-5 py-4 border-2 rounded-geometric transition-all duration-300 font-sans font-bold uppercase text-sm ${
                  isActive
                    ? 'bg-brand-accent text-text-primary border-text-primary shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] translate-x-1 -translate-y-1'
                    : 'bg-transparent border-transparent text-gray-300 hover:border-gray-500 hover:bg-white/5 hover:translate-x-2'
                }`}
              >
                <Icon size={20} strokeWidth={2.5} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-6 border-t-4 border-text-primary bg-white text-text-primary md:rounded-br-geometric-lg">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-sm font-bold uppercase truncate">{user.username}</p>
              <p className="text-xs text-text-secondary uppercase">{user.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-3 border-2 border-text-primary rounded-full hover:bg-brand hover:text-white transition-all duration-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px]"
            >
              <LogOut size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto w-full relative z-0">
        {/* Background decorative geometric shapes */}
        <div className="fixed top-0 right-0 w-[50vw] h-[50vw] max-w-lg max-h-lg bg-brand-accent rounded-full blur-[100px] opacity-30 pointer-events-none mix-blend-multiply"></div>
        <div className="fixed bottom-0 left-[20vw] w-[40vw] h-[40vw] max-w-md max-h-md bg-brand rounded-full blur-[80px] opacity-20 pointer-events-none mix-blend-multiply"></div>

        <div className="max-w-6xl mx-auto relative z-10 w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
