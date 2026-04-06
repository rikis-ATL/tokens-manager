/**
 * @jest-environment jsdom
 */

import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorPaletteRow } from '../ColorPaletteRow';
import { SpacingPreview } from '../SpacingPreview';
import { TypographySpecimen } from '../TypographySpecimen';
import { ShadowPreview } from '../ShadowPreview';
import { BorderRadiusPreview } from '../BorderRadiusPreview';
import { StyleGuidePanel } from '../../StyleGuidePanel';
import type { GeneratedToken } from '@/types/token.types';

jest.mock('@/services', () => ({
  tokenService: {
    resolveTokenReference: (value: string) => value,
  },
}));

describe('Style Guide previews (Phase 25)', () => {
  describe('ColorPaletteRow', () => {
    it('shows tooltip with path and hex on hover (D-07)', async () => {
      const user = userEvent.setup();
      const tokens: GeneratedToken[] = [
        { id: '1', path: 'color.brand.primary', value: '#0056D2', type: 'color' },
      ];
      const { container } = render(<ColorPaletteRow tokens={tokens} resolveRef={(v) => v} />);
      const swatch = container.querySelector('.cursor-default');
      expect(swatch).toBeTruthy();
      await user.hover(swatch!);
      await waitFor(() => {
        const matches = screen.getAllByText(/color\.brand\.primary:\s*#0056D2/);
        expect(matches.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('SpacingPreview', () => {
    it('renders bar width capped at 300px from numeric dimension (D-08)', () => {
      const token: GeneratedToken = {
        id: '1',
        path: 'space.md',
        value: '24',
        type: 'dimension',
      };
      render(<SpacingPreview token={token} resolvedValue="24" />);
      const el = document.querySelector('.bg-gray-300') as HTMLElement;
      expect(el).toBeTruthy();
      expect(el.style.width).toBe('24px');
      expect(screen.getByText(/space\.md:\s*24/)).toBeInTheDocument();
    });

    it('caps width at 300 for large values', () => {
      const token: GeneratedToken = {
        id: '1',
        path: 'space.xl',
        value: '999',
        type: 'dimension',
      };
      render(<SpacingPreview token={token} resolvedValue="999" />);
      const el = document.querySelector('.bg-gray-300') as HTMLElement;
      expect(el.style.width).toBe('300px');
    });
  });

  describe('TypographySpecimen', () => {
    it('applies font styles from composite token value (D-09)', () => {
      const token: GeneratedToken = {
        id: '1',
        path: 'type.body',
        value: {
          fontFamily: 'Georgia, serif',
          fontSize: '16px',
          fontWeight: '400',
        },
        type: 'typography',
      };
      render(<TypographySpecimen token={token} resolvedValue="" />);
      const sample = screen.getByText(/The quick brown fox/);
      expect(sample).toHaveStyle({ fontFamily: 'Georgia, serif', fontSize: '16px' });
    });
  });

  describe('ShadowPreview', () => {
    it('applies boxShadow on 30×30 tile (D-10)', () => {
      const token: GeneratedToken = {
        id: '1',
        path: 'shadow.card',
        value: '0 2px 4px rgba(0,0,0,0.2)',
        type: 'boxShadow',
      };
      render(<ShadowPreview token={token} resolvedValue="0 2px 4px rgba(0,0,0,0.2)" />);
      const tile = document.querySelector('.w-\\[30px\\]') as HTMLElement;
      expect(tile).toBeTruthy();
      expect(tile.style.boxShadow).toBe('0 2px 4px rgba(0,0,0,0.2)');
    });
  });

  describe('BorderRadiusPreview', () => {
    it('applies borderRadius on 30×30 tile (D-11)', () => {
      const token: GeneratedToken = {
        id: '1',
        path: 'radius.md',
        value: '8px',
        type: 'borderRadius',
      };
      render(<BorderRadiusPreview token={token} resolvedValue="8px" />);
      const tile = document.querySelector('.w-\\[30px\\]') as HTMLElement;
      expect(tile).toBeTruthy();
      expect(tile.style.borderRadius).toBe('8px');
    });
  });

  describe('StyleGuidePanel', () => {
    it('re-renders color section when tokens prop changes (D-06 proxy)', () => {
      const tokensA: GeneratedToken[] = [
        { id: '1', path: 'color.a', value: '#111111', type: 'color' },
      ];
      const tokensB: GeneratedToken[] = [
        { id: '1', path: 'color.a', value: '#222222', type: 'color' },
      ];
      const { rerender } = render(
        <StyleGuidePanel tokens={tokensA} allGroups={[]} />,
      );
      let swatch = document.querySelector('.cursor-default') as HTMLElement;
      expect(swatch?.style.backgroundColor).toMatch(/#111111|rgb\(17,\s*17,\s*17\)/);

      rerender(<StyleGuidePanel tokens={tokensB} allGroups={[]} />);
      swatch = document.querySelector('.cursor-default') as HTMLElement;
      expect(swatch?.style.backgroundColor).toMatch(/#222222|rgb\(34,\s*34,\s*34\)/);
    });

    it('renders Colors section when color tokens present', () => {
      const tokens: GeneratedToken[] = [
        { id: '1', path: 'c', value: '#000', type: 'color' },
      ];
      render(<StyleGuidePanel tokens={tokens} allGroups={[]} />);
      expect(screen.getByText('Colors')).toBeInTheDocument();
    });
  });
});
