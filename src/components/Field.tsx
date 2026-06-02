import { type ChangeEvent } from 'react';

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  hint?: string;
  fullWidth?: boolean;
}

export function Field({ label, value, onChange, placeholder, type = 'text', hint, fullWidth }: FieldProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value);
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      />
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  fullWidth?: boolean;
}

export function SelectField({ label, value, onChange, options, fullWidth }: SelectFieldProps) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
