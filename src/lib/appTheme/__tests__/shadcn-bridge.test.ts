import { appendShadcnBridge, shadcnSourceVarName } from '../shadcn-bridge';

describe('shadcnSourceVarName', () => {
  it('builds SD-style var names for token namespace', () => {
    expect(shadcnSourceVarName('token', 'background')).toBe('--token-shadcn-background');
    expect(shadcnSourceVarName('token', 'card-foreground')).toBe('--token-shadcn-card-foreground');
  });
});

describe('appendShadcnBridge', () => {
  it('appends :root aliases when only :root exists', () => {
    const input = ':root {\n  --token-shadcn-background: 0 0% 100%;\n}\n';
    const out = appendShadcnBridge(input, 'token');
    expect(out).toContain(':root {');
    expect(out).toContain('--background: var(--token-shadcn-background);');
    expect(out.split(':root').length).toBeGreaterThanOrEqual(2);
  });

  it('appends both selectors for combined light+dark output', () => {
    const input = `:root { --x: 1; }
[data-color-mode="dark"] { --x: 2; }`;
    const out = appendShadcnBridge(input, 'token');
    expect(out).toContain('[data-color-mode="dark"]');
    expect(out.match(/\[data-color-mode="dark"\]/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
