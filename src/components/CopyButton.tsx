import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/*
 * CopyButton
 * Small reusable "copy to clipboard" control with its own transient "Copied"
 * state, so multiple buttons on the same card don't flash in unison.
 */
interface Props {
  text: string;
  label?: string;
  className?: string;
}

export default function CopyButton({ text, label = 'Copy', className = '' }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors ${className}`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : label}
    </button>
  );
}
