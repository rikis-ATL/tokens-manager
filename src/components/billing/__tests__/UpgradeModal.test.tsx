/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UpgradeModal } from '../UpgradeModal';

describe('UpgradeModal', () => {
  const payload = { resource: 'collections', current: 1, max: 1, tier: 'free' };

  it('renders all three tier columns', () => {
    render(<UpgradeModal payload={payload} onClose={() => {}} />);
    const free = screen.getByText(/free/i, { selector: 'h3' });
    const pro = screen.getByText(/^pro$/i, { selector: 'h3' });
    const team = screen.getByText(/team/i, { selector: 'h3' });
    expect(free).toBeInTheDocument();
    expect(pro).toBeInTheDocument();
    expect(team).toBeInTheDocument();
  });

  it('marks the current tier with data-current="true"', () => {
    render(<UpgradeModal payload={payload} onClose={() => {}} />);
    const freeCell = document.querySelector('[data-tier="free"]');
    expect(freeCell).toHaveAttribute('data-current', 'true');
  });

  it('"Upgrade to Pro" CTA is disabled with Phase 24 tooltip (D-04)', () => {
    render(<UpgradeModal payload={payload} onClose={() => {}} />);
    const cta = screen.getByTestId('upgrade-cta');
    expect(cta).toBeDisabled();
    expect(cta).toHaveAttribute('title', expect.stringMatching(/Phase 24|Available soon/i));
  });
});
