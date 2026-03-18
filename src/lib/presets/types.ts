export interface PresetOption {
  id: string;
  name: string;
  description: string;
  tokens: Record<string, unknown>;
}

export interface DesignSystemPreset {
  id: string;
  name: string;
  palette: PresetOption;
  typescale: PresetOption;
  spacing: PresetOption;
}
