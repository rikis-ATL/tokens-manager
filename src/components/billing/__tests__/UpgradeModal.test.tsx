/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UpgradeModal } from '../UpgradeModal';

describe('UpgradeModal', () => {
  const payload = { resource: 'collections', current: 1, max: 1, tier: 'free' };

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

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

  it('CTA shows "Contact your admin to upgrade" message', () => {
    render(<UpgradeModal payload={payload} onClose={() => {}} />);
    const cta = screen.getByTestId('upgrade-cta');
    expect(cta).toHaveTextContent('Contact your admin to upgrade');
  });
});
