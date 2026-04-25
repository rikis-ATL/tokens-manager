import { parseBareHslComponents, parseColor } from '../color.utils';

describe('parseBareHslComponents', () => {
  it('parses shadcn-style space-separated HSL (no hsl())', () => {
    const rgb = parseBareHslComponents('222.2 84% 4.9%');
    expect(rgb).not.toBeNull();
    expect(rgb!.r).toBeGreaterThanOrEqual(0);
    expect(rgb!.r).toBeLessThanOrEqual(255);
  });

  it('ignores optional alpha for RGB preview', () => {
    const a = parseBareHslComponents('224.3 76.3% 48% / 0.5');
    const b = parseBareHslComponents('224.3 76.3% 48%');
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a).toEqual(b);
  });
});

describe('parseColor', () => {
  it('accepts bare HSL via parseBareHslComponents', () => {
    expect(parseColor('0 0% 100%')).not.toBeNull();
    expect(parseColor('hsl(0 0% 100%)')).not.toBeNull();
  });
});
