'use client';

import { useState } from 'react';
import { Plus, X, Palette, Ruler, Type, Circle, Minus, AlignJustify, Disc, Bold, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GENERATOR_CATEGORIES } from '@/types/generator.types';
import type { TokenType } from '@/types';

const KIND_STYLES: Record<string, string> = {
  color:     'bg-pink-50 text-pink-700 border-pink-200',
  dimension: 'bg-sky-50 text-sky-700 border-sky-200',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  color:        <Palette size={12} />,
  dimension:    <Ruler size={12} />,
  fontSize:     <Type size={12} />,
  borderRadius: <Circle size={12} />,
  borderWidth:  <Minus size={12} />,
  lineHeight:   <AlignJustify size={12} />,
  opacity:      <Disc size={12} />,
  fontWeight:   <Bold size={12} />,
};

interface FloatingAddNodePanelProps {
  groupName: string;
  onAddGenerator: (type: TokenType) => void;
}

export function FloatingAddNodePanel({ groupName, onAddGenerator }: FloatingAddNodePanelProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (type: TokenType) => {
    onAddGenerator(type);
    setOpen(false);
  };

  return (
    <div className="absolute top-3 left-3 z-10 pointer-events-auto">
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden w-56">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-1.5 min-w-0">
            <Layers size={12} className="text-indigo-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-gray-700 truncate">{groupName}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md flex-shrink-0 ml-2 gap-1"
            onClick={() => setOpen(o => !o)}
          >
            {open ? <X size={10} /> : <Plus size={10} />}
            {open ? 'Close' : 'Add Node'}
          </Button>
        </div>

        {/* Generator type picker */}
        {open && (
          <div className="py-1">
            <div className="px-3 py-1">
              <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">
                Generator Type
              </span>
            </div>
            {GENERATOR_CATEGORIES.map(cat => (
              <button
                key={cat.type}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 transition-colors text-left"
                onClick={() => handleSelect(cat.type)}
              >
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded border text-[10px] flex-shrink-0 ${KIND_STYLES[cat.kind]}`}
                >
                  {TYPE_ICONS[cat.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-700">{cat.label}</div>
                  <div className="text-[9px] text-gray-400 capitalize">{cat.kind} scale</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
