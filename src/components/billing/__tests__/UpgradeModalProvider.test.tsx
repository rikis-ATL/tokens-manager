/** @jest-environment jsdom */
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UpgradeModalProvider, useUpgradeModal } from '../UpgradeModalProvider';

function Trigger() {
  const { openUpgradeModal } = useUpgradeModal();
  return (
    <button onClick={() => openUpgradeModal({ resource: 'collections', current: 1, max: 1, tier: 'free' })}>
      trigger
    </button>
  );
}

describe('UpgradeModalProvider + useUpgradeModal', () => {
  it('throws when useUpgradeModal called outside provider', () => {
    function Broken() { useUpgradeModal(); return null; }
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Broken />)).toThrow(/UpgradeModalProvider/);
    err.mockRestore();
  });

  it('opens modal when openUpgradeModal is called', () => {
    render(<UpgradeModalProvider><Trigger /></UpgradeModalProvider>);
    expect(screen.queryByTestId('upgrade-modal')).toBeNull();
    act(() => { screen.getByText('trigger').click(); });
    expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();
  });

  it('closes modal when onClose is triggered', () => {
    render(<UpgradeModalProvider><Trigger /></UpgradeModalProvider>);
    act(() => { screen.getByText('trigger').click(); });
    expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();
    act(() => { screen.getAllByText('Close')[0].click(); });
    expect(screen.queryByTestId('upgrade-modal')).toBeNull();
  });
});
