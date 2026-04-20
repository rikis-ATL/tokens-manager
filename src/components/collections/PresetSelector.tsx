'use client';

import type { PresetOption } from '@/lib/presets';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PresetSelectorProps {
  label: string;
  presets: PresetOption[];
  value: string;
  onValueChange: (value: string) => void;
}

export function PresetSelector({ label, presets, value, onValueChange }: PresetSelectorProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="None" />
        </SelectTrigger>
        <SelectContent className="max-h-[min(280px,45vh)]">
          <SelectItem value="none">None</SelectItem>
          {presets.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value !== 'none' && (
        <p className="text-xs text-muted-foreground">
          {presets.find((p) => p.id === value)?.description}
        </p>
      )}
    </div>
  );
}
