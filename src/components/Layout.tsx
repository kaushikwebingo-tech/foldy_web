import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { getToken } from '@/lib/utils';
import { Copy, Check, Wifi } from 'lucide-react';
import { useState } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  const token = getToken();
  const [copied, setCopied] = useState(false);

  const copyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
          <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            <Wifi size={11} />
            <span className="font-medium">localhost:5000</span>
          </div>
          <div className="flex-1" />
          {token ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 max-w-xs">
              <span className="text-xs text-slate-500 shrink-0 font-medium">JWT:</span>
              <span className="text-xs text-slate-600 font-mono truncate">{token.slice(0, 24)}…</span>
              <button onClick={copyToken} className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              No token — login first
            </span>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
