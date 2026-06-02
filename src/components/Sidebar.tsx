import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, LogIn, User, FileText, BarChart2,
  Building2, Receipt, HardDrive, CreditCard, FolderOpen,
  ShieldCheck, LogOut, ChevronRight,
} from 'lucide-react';
import { getToken, removeToken } from '@/lib/utils';

const NAV = [
  { group: 'Auth',      items: [
    { label: 'Login / OTP',   path: '/login',       icon: <LogIn size={16} /> },
    { label: 'Onboarding',    path: '/onboarding',  icon: <User size={16} /> },
  ]},
  { group: 'B2B Features', items: [
    { label: 'GST Profile',   path: '/gst-profile',   icon: <Building2 size={16} /> },
    { label: 'Finance Status',path: '/finance-status',icon: <BarChart2 size={16} /> },
    { label: 'GST Taxpayer',  path: '/gst-taxpayer',  icon: <FileText size={16} /> },
    { label: 'TDS',           path: '/tds',            icon: <Receipt size={16} /> },
  ]},
  { group: 'Storage',   items: [
    { label: 'Documents',     path: '/storage',       icon: <FolderOpen size={16} /> },
  ]},
  { group: 'Finance',   items: [
    { label: 'Payments',      path: '/payments',      icon: <CreditCard size={16} /> },
    { label: 'DigiLocker',    path: '/digilocker',    icon: <HardDrive size={16} /> },
  ]},
  { group: 'Admin',     items: [
    { label: 'Admin Panel',   path: '/admin',         icon: <ShieldCheck size={16} /> },
  ]},
];

export default function Sidebar() {
  const navigate  = useNavigate();
  const loggedIn  = !!getToken();

  const handleLogout = () => {
    removeToken();
    navigate('/login');
  };

  return (
    <aside className="w-60 shrink-0 bg-[#0D1B2A] flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#1A73E8] rounded-lg flex items-center justify-center">
            <LayoutDashboard size={14} className="text-white" />
          </div>
          <span className="font-bold text-white text-base tracking-tight">Foldy</span>
          <span className="text-xs text-blue-400 font-medium ml-auto">Dev</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {NAV.map(group => (
          <div key={group.group} className="mb-4">
            <p className="px-5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
              {group.group}
            </p>
            {group.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors group ${
                    isActive
                      ? 'bg-[#1A73E8]/15 text-white border-r-2 border-[#1A73E8]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                <ChevronRight size={12} className="opacity-0 group-hover:opacity-50 transition-opacity" />
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        {loggedIn ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors w-full"
          >
            <LogOut size={14} />
            Logout
          </button>
        ) : (
          <p className="text-xs text-slate-600">Not logged in</p>
        )}
        <p className="text-[10px] text-slate-600 mt-2">Foldy Dev Console v0.2</p>
      </div>
    </aside>
  );
}
