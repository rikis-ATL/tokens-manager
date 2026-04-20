'use client';

import { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  parseColor, 
  rgbToHex, 
  colorToHex, 
  colorToHsl, 
  colorToOklch,
  formatHsl,
  formatOklch,
  rgbToHsl,
  rgbToOklch,
  type ColorFormat 
} from '@/utils/color.utils';

export interface MultiFormatColorPickerProps {
  value: string;
  defaultFormat?: ColorFormat;
  onChange: (value: string) => void;
  className?: string;
}

export function MultiFormatColorPicker({
  value,
  defaultFormat = 'hex',
  onChange,
  className = '',
}: MultiFormatColorPickerProps) {
  const [activeTab, setActiveTab] = useState<ColorFormat>(defaultFormat);
  const [hexValue, setHexValue] = useState('#000000');
  const [hslValue, setHslValue] = useState('hsl(0, 0%, 0%)');
  const [oklchValue, setOklchValue] = useState('oklch(0 0 0)');

  useEffect(() => {
    const rgb = parseColor(value);
    if (rgb) {
      setHexValue(rgbToHex(rgb.r, rgb.g, rgb.b));
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      setHslValue(formatHsl(hsl.h, hsl.s, hsl.l));
      const oklch = rgbToOklch(rgb.r, rgb.g, rgb.b);
      setOklchValue(formatOklch(oklch.l, oklch.c, oklch.h));
    }
  }, [value]);

  const handleHexChange = (newHex: string) => {
    setHexValue(newHex);
    onChange(newHex);
  };

  const handleHslInputChange = (newHsl: string) => {
    setHslValue(newHsl);
    const rgb = parseColor(newHsl);
    if (rgb) {
      onChange(newHsl);
    }
  };

  const handleOklchInputChange = (newOklch: string) => {
    setOklchValue(newOklch);
    const rgb = parseColor(newOklch);
    if (rgb) {
      onChange(newOklch);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as ColorFormat);
    
    // Convert current value to the new format
    let newValue = value;
    switch (tab) {
      case 'hex':
        newValue = colorToHex(value);
        break;
      case 'hsl':
        newValue = colorToHsl(value);
        break;
      case 'oklch':
        newValue = colorToOklch(value);
        break;
    }
    onChange(newValue);
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hex">Hex</TabsTrigger>
          <TabsTrigger value="hsl">HSL</TabsTrigger>
          <TabsTrigger value="oklch">OKLCH</TabsTrigger>
        </TabsList>

        <TabsContent value="hex" className="space-y-2">
          <HexColorPicker
            color={hexValue}
            onChange={handleHexChange}
            style={{ width: '100%', height: '150px' }}
          />
          <Input
            value={hexValue}
            onChange={(e) => handleHexChange(e.target.value)}
            className="font-mono text-sm"
            placeholder="#ffffff"
          />
          <p className="text-xs text-muted-foreground">
            Universal format, supported everywhere
          </p>
        </TabsContent>

        <TabsContent value="hsl" className="space-y-2">
          <HexColorPicker
            color={hexValue}
            onChange={(hex) => {
              const hsl = colorToHsl(hex);
              setHslValue(hsl);
              onChange(hsl);
            }}
            style={{ width: '100%', height: '150px' }}
          />
          <Input
            value={hslValue}
            onChange={(e) => handleHslInputChange(e.target.value)}
            className="font-mono text-sm"
            placeholder="hsl(180, 50%, 50%)"
          />
          <p className="text-xs text-muted-foreground">
            Intuitive hue, saturation, lightness values
          </p>
        </TabsContent>

        <TabsContent value="oklch" className="space-y-2">
          <HexColorPicker
            color={hexValue}
            onChange={(hex) => {
              const oklch = colorToOklch(hex);
              setOklchValue(oklch);
              onChange(oklch);
            }}
            style={{ width: '100%', height: '150px' }}
          />
          <Input
            value={oklchValue}
            onChange={(e) => handleOklchInputChange(e.target.value)}
            className="font-mono text-sm"
            placeholder="oklch(0.5 0.1 180)"
          />
          <p className="text-xs text-muted-foreground">
            Perceptually uniform color space
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
