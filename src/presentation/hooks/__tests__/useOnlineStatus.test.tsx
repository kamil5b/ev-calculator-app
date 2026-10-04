import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { useOnlineStatus } from '../useOnlineStatus';

function Probe() {
  const online = useOnlineStatus();
  return <span data-testid="status">{online ? 'online' : 'offline'}</span>;
}

/** jsdom lets us fake the browser's connectivity flag. */
const setNavigatorOnLine = (value: boolean) =>
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });

describe('useOnlineStatus', () => {
  afterEach(() => {
    setNavigatorOnLine(true);
  });

  it('reports online by default', () => {
    render(<Probe />);
    expect(screen.getByTestId('status')).toHaveTextContent('online');
  });

  it('reports offline when the browser starts offline', () => {
    setNavigatorOnLine(false);
    render(<Probe />);
    expect(screen.getByTestId('status')).toHaveTextContent('offline');
  });

  it('flips to offline and back on the window events', () => {
    render(<Probe />);

    fireEvent(window, new Event('offline'));
    expect(screen.getByTestId('status')).toHaveTextContent('offline');

    fireEvent(window, new Event('online'));
    expect(screen.getByTestId('status')).toHaveTextContent('online');
  });
});
