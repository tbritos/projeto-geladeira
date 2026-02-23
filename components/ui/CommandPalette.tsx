import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Command } from 'lucide-react';

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  keywords?: string[];
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
  title?: string;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, items, title = 'Comandos' }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 30);
    return items
      .filter((item) => {
        const content = [item.label, item.hint ?? '', ...(item.keywords ?? [])].join(' ').toLowerCase();
        return content.includes(q);
      })
      .slice(0, 30);
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((idx) => Math.min(filtered.length - 1, idx + 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((idx) => Math.max(0, idx - 1));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const item = filtered[activeIndex];
        if (item) {
          item.onSelect();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, filtered, onClose, open]);

  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, filtered.length]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 pt-20">
      <div className="w-full max-w-2xl border border-slate-700 rounded-xl bg-[#020617] shadow-2xl overflow-hidden">
        <div className="border-b border-slate-800 p-3 flex items-center gap-2">
          <Command size={16} className="text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar comandos, telas e atalhos..."
            className="w-full bg-transparent outline-none text-sm text-white placeholder:text-slate-500"
          />
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-white">
            Esc
          </button>
        </div>
        <div className="px-3 py-2 text-[11px] text-slate-500 uppercase tracking-wide">{title}</div>
        <div className="max-h-[55vh] overflow-y-auto pb-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-400">Nenhum resultado encontrado.</div>
          ) : (
            filtered.map((item, index) => (
              <button
                key={item.id}
                onClick={() => {
                  item.onSelect();
                  onClose();
                }}
                className={`w-full text-left px-4 py-3 border-l-2 transition-colors ${
                  index === activeIndex
                    ? 'border-primary bg-slate-800/60 text-white'
                    : 'border-transparent text-slate-300 hover:bg-slate-900/50'
                }`}
              >
                <div className="font-medium text-sm">{item.label}</div>
                {item.hint && <div className="text-xs text-slate-500">{item.hint}</div>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
