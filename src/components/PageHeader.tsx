import type { ReactNode } from 'react';
import { Download } from 'lucide-react';
import { getSection } from '@/lib/apiCatalog';
import { downloadSection } from '@/lib/postman';

interface Props {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: string;
  postmanSection?: string;
}

export default function PageHeader({ title, subtitle, icon, badge, postmanSection }: Props) {
  const section = postmanSection ? getSection(postmanSection) : undefined;

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-3">
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

        {section && (
          <button
            onClick={() => downloadSection(section)}
            title={`Download Postman collection for ${section.name}`}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:text-[#1A73E8] hover:border-[#1A73E8] bg-white transition-colors"
          >
            <Download size={14} />
            Collection
          </button>
        )}
      </div>
      {subtitle && <p className="text-sm text-slate-500 ml-12">{subtitle}</p>}
    </div>
  );
}
