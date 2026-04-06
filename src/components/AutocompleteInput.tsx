'use client';

import { useState, useRef, useEffect } from 'react';

interface AutocompleteInputProps {
  label: string;
  fieldName: string;
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
  onDeleteSuggestion: (value: string) => void;
  pinned?: boolean;
  onPin?: () => void;
  placeholder?: string;
}

export default function AutocompleteInput({
  label,
  fieldName,
  value,
  onChange,
  suggestions,
  onDeleteSuggestion,
  pinned,
  onPin,
  placeholder = '入力または履歴から選択',
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = suggestions.filter((s) =>
    s.toLowerCase().includes((filter || value).toLowerCase())
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, []);

  return (
    <div ref={wrapRef}>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs text-stone-500">{label}</span>
        {pinned !== undefined && (
          <button
            onClick={onPin}
            className={`ml-auto w-7 h-7 rounded-full flex items-center justify-center text-xs ${
              pinned
                ? 'bg-purple-100 text-purple-600'
                : 'text-stone-400 hover:bg-stone-100'
            }`}
          >
            📌
          </button>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setFilter(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full h-[48px] px-4 rounded-xl border border-stone-200 text-base touch-manipulation focus:outline-none focus:border-orange-600"
      />
      {open && filtered.length > 0 && (
        <div className="mt-1 bg-white border border-stone-200 rounded-xl max-h-[200px] overflow-y-auto shadow-sm">
          {filtered.map((s) => (
            <div
              key={s}
              className="flex items-center justify-between px-4 py-3 active:bg-stone-50 touch-manipulation"
            >
              <span
                className="flex-1 text-sm"
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
              >
                {s}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSuggestion(s);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:bg-red-50 hover:text-red-600 touch-manipulation"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
