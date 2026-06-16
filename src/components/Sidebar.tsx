import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  LogIn,
  User,
  FileText,
  BarChart2,
  Building2,
  Receipt,
  HardDrive,
  CreditCard,
  FolderOpen,
  ShieldCheck,
  LogOut,
  ChevronRight,
  UploadCloud,
  Server,
} from "lucide-react";
import { getToken, removeToken, getApiHost, setApiHost } from "@/lib/utils";

/* ── nav definition ──────────────────────────────────────────────── */
const AUTH_NAV = [
  {
    label: "Login / OTP",
    path: "/login",
    icon: <LogIn size={16} />,
    guestOnly: true,
  },
];

const GROUPS = [
  {
    group: "Profile Area",
    items: [
      {
        label: "Onboarding",
        path: "/onboarding",
        icon: <User size={16} />,
      },
    ],
  },
  {
    group: "B2B Features",
    items: [
      {
        label: "GST Profile",
        path: "/gst-profile",
        icon: <Building2 size={16} />,
      },
      {
        label: "Finance Status",
        path: "/finance-status",
        icon: <BarChart2 size={16} />,
      },
      {
        label: "GST Taxpayer",
        path: "/gst-taxpayer",
        icon: <FileText size={16} />,
      },
      { label: "TDS", path: "/tds", icon: <Receipt size={16} /> },
    ],
  },
  {
    group: "Storage",
    items: [
      { label: "Documents", path: "/storage", icon: <FolderOpen size={16} /> },
      {
        label: "Manual Uploads",
        path: "/manual-uploads",
        icon: <UploadCloud size={16} />,
      },
    ],
  },
  {
    group: "Finance",
    items: [
      { label: "Payments", path: "/payments", icon: <CreditCard size={16} /> },
      {
        label: "DigiLocker",
        path: "/digilocker",
        icon: <HardDrive size={16} />,
      },
    ],
  },
  {
    group: "Admin",
    items: [
      { label: "Admin Panel", path: "/admin", icon: <ShieldCheck size={16} /> },
    ],
  },
];

/* ── component ───────────────────────────────────────────────────── */
export default function Sidebar() {
  const navigate = useNavigate();
  const loggedIn = !!getToken();
  const [hostInput, setHostInput] = useState(getApiHost());
  const [savedHost, setSavedHost] = useState(getApiHost());

  const applyHost = () => {
    setApiHost(hostInput);
    const effective = getApiHost();
    setHostInput(effective);
    setSavedHost(effective);
  };

  const handleLogout = () => {
    removeToken();
    navigate("/login");
    // force re-render by reloading
    window.location.href = "/login";
  };

  return (
    <aside className="w-60 shrink-0 bg-[#0D1B2A] flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#1A73E8] rounded-lg flex items-center justify-center">
            <LayoutDashboard size={14} className="text-white" />
          </div>
          <span className="font-bold text-white text-base tracking-tight">
            Foldy
          </span>
          <span className="text-xs text-blue-400 font-medium ml-auto">Dev</span>
        </div>
      </div>

      {/* API host target */}
      <div className="px-5 py-3 border-b border-white/10">
        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">
          <Server size={11} />
          API Host
        </label>
        <div className="flex gap-1.5">
          <input
            value={hostInput}
            onChange={(e) => setHostInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyHost()}
            placeholder="localhost:5000"
            spellCheck={false}
            className="min-w-0 flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#1A73E8]"
          />
          <button
            onClick={applyHost}
            className="shrink-0 px-2 py-1 text-xs font-semibold rounded bg-[#1A73E8] hover:bg-[#1558C0] text-white transition-colors"
          >
            Set
          </button>
        </div>
        <p
          className="text-[10px] mt-1.5 truncate"
          title={savedHost || "http://localhost:5000 (via dev proxy)"}
        >
          {savedHost ? (
            <span className="text-amber-400">→ {savedHost}</span>
          ) : (
            <span className="text-slate-600">→ localhost:5000 (default)</span>
          )}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {/* Dashboard — always visible */}
        <div className="mb-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors group ${
                isActive
                  ? "bg-[#1A73E8]/15 text-white border-r-2 border-[#1A73E8]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <LayoutDashboard size={16} />
            <span className="flex-1">Dashboard</span>
          </NavLink>
        </div>

        {/* Login & Onboarding — only when NOT logged in */}
        {!loggedIn && (
          <div className="mb-4">
            <p className="px-5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
              Account
            </p>

            {AUTH_NAV.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors group ${
                    isActive
                      ? "bg-[#1A73E8]/15 text-white border-r-2 border-[#1A73E8]"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                <ChevronRight
                  size={12}
                  className="opacity-0 group-hover:opacity-50 transition-opacity"
                />
              </NavLink>
            ))}
          </div>
        )}

        {/* All other groups — always visible */}
        {GROUPS.map((group) => (
          <div key={group.group} className="mb-4">
            <p className="px-5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
              {group.group}
            </p>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors group ${
                    isActive
                      ? "bg-[#1A73E8]/15 text-white border-r-2 border-[#1A73E8]"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                <ChevronRight
                  size={12}
                  className="opacity-0 group-hover:opacity-50 transition-opacity"
                />
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
        <p className="text-[10px] text-slate-600 mt-2">
          Foldy Dev Console v0.2
        </p>
      </div>
    </aside>
  );
}
