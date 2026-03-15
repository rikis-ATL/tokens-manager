'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';
import { X } from 'lucide-react';

// ── Form row ──────────────────────────────────────────────────────────────────
// `handle` renders inside the same `relative` container so that handles
// positioned with `left/right: -20` align perfectly with the row's midpoint.

export function Row({
  label,
  children,
  handle,
}: {
  label: ReactNode;
  children: ReactNode;
  handle?: ReactNode;
}) {
  return (
    <div className="relative flex items-center gap-2 min-h-[26px]">
      {handle}
      <span className="text-[10px] text-gray-400 w-20 flex-shrink-0 leading-tight">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ── RowHandle — aligns a React Flow handle with its Row's vertical midpoint ───

export function RowHandle({
  id,
  type = 'target',
  side = 'left',
  className,
  title,
}: {
  id: string;
  type?: 'target' | 'source';
  side?: 'left' | 'right';
  className: string;
  title?: string;
}) {
  return (
    <Handle
      type={type}
      id={id}
      position={side === 'left' ? Position.Left : Position.Right}
      title={title}
      className={className}
      style={{
        [side === 'left' ? 'left' : 'right']: -20,
        top: '50%',
        transform: 'translateY(-50%)',
        position: 'absolute',
      }}
    />
  );
}

// ── NativeSelect ──────────────────────────────────────────────────────────────

export function NativeSelect({
  value,
  onChange,
  options,
}: {
  value: string | number;
  onChange: (v: string) => void;
  options: { value: string | number; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="nodrag w-full text-[11px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-300"
    >
      {options.map(o => (
        <option key={String(o.value)} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ── NumberInput ───────────────────────────────────────────────────────────────
// Uses local state so typing never propagates to the graph until blur / Enter.

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  disabled,
  className = '',
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}) {
  const [local, setLocal] = useState(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setLocal(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const n = parseFloat(raw);
    if (!isNaN(n)) onChange(n);
  };

  return (
    <input
      type="number"
      value={local}
      min={min}
      max={max}
      step={step ?? 1}
      disabled={disabled}
      onChange={e => setLocal(e.target.value)}
      onFocus={() => { focused.current = true; }}
      onBlur={e => { focused.current = false; commit(e.target.value); }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className={`nodrag w-full text-[11px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-300 ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
    />
  );
}

// ── TextInput ─────────────────────────────────────────────────────────────────
// Uses local state so typing never propagates to the graph until blur / Enter.

export function TextInput({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [local, setLocal] = useState(value);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setLocal(value);
  }, [value]);

  return (
    <input
      type="text"
      value={local}
      placeholder={placeholder}
      onChange={e => setLocal(e.target.value)}
      onFocus={() => { focused.current = true; }}
      onBlur={e => { focused.current = false; onChange(e.target.value); }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className={`nodrag w-full text-[11px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-300 ${className}`}
    />
  );
}

// ── Handle style tokens ───────────────────────────────────────────────────────

export const HANDLE_NUMBER = '!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-white';
export const HANDLE_STRING = '!w-2.5 !h-2.5 !bg-green-400 !border-2 !border-white';
export const HANDLE_ARRAY  = '!w-2.5 !h-2.5 !bg-violet-400 !border-2 !border-white';
export const HANDLE_OUT    = '!w-2.5 !h-2.5 !bg-gray-400 !border-2 !border-white';
export const HANDLE_IN     = '!w-2.5 !h-2.5 !bg-amber-400 !border-2 !border-white';

// ── Node wrapper ──────────────────────────────────────────────────────────────
// 'group' class enables CSS group-hover on children (e.g. delete button in header).

export function NodeWrapper({
  width = 240,
  borderColor,
  children,
}: {
  width?: number;
  borderColor: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`group bg-white rounded-lg border-2 shadow-sm ${borderColor}`}
      style={{ width }}
      onWheel={e => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

// ── Node header ───────────────────────────────────────────────────────────────
// Optional onDelete renders a × button that only appears when the node is hovered.

export function NodeHeader({
  icon,
  title,
  badge,
  headerClass,
  onDelete,
}: {
  icon: ReactNode;
  title: string;
  badge?: string;
  headerClass: string;
  onDelete?: () => void;
}) {
  return (
    <div className={`px-3 py-2 border-b flex items-center gap-2 rounded-t-[6px] ${headerClass}`}>
      <span className="flex-shrink-0">{icon}</span>
      <span className="text-xs font-semibold flex-1 truncate">{title}</span>
      {badge && <span className="text-[10px] opacity-60 mr-1">{badge}</span>}
      {onDelete && (
        <button
          onClick={onDelete}
          title="Delete node"
          className="nodrag flex-shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 text-current hover:text-red-500 hover:bg-red-100 transition-all"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}

// ── Preview section ───────────────────────────────────────────────────────────

export function PreviewSection({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 border-t border-gray-100 pt-2">
      <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
        Preview
      </div>
      {children}
    </div>
  );
}
