import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: string;
}

export default function PageHeader({ title, subtitle, icon, badge }: Props) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-1">
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-[#1A73E8]/10 flex items-center justify-center text-[#1A73E8]">
            {icon}
          </div>
        )}
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-800">{title}</h1>
          {badge && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{badge}</span>
          )}
        </div>
      </div>
      {subtitle && <p className="text-sm text-slate-500 ml-12">{subtitle}</p>}
    </div>
  );
}
