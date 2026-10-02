import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { BatteryCalculator } from '../BatteryCalculator';
import {
  LocalStorageAdapter,
  MemoryStorageAdapter,
} from '../../../infrastructure/storage/LocalStorageAdapter';

/**
 * Renders against a real (writable) store, matching production. The setup file
 * clears `localStorage` after every test so runs stay independent.
 */
const renderCalculator = () =>
  render(<BatteryCalculator storage={new LocalStorageAdapter(window.localStorage)} />);

describe('BatteryCalculator', () => {
  it('should render input section', () => {
    renderCalculator();
    expect(screen.getByText(/EV Battery Calculator/i)).toBeInTheDocument();
  });

  it('should update output when input changes', () => {
    renderCalculator();
    // Default capacity is 75 kWh, so 75% of it is 56.3 kWh.
    const slider = screen.getByRole('slider', { name: /current battery/i });
    fireEvent.change(slider, { target: { value: '75' } });
    expect(screen.getByText(/current battery: 56.3 kwh/i)).toBeInTheDocument();
  });

  it('reproduces the Appendix A scenario from a registered 82 kWh car', () => {
    renderCalculator();

    // Register a car through the UI so the whole flow is exercised.
    fireEvent.click(screen.getByRole('button', { name: /register car/i }));
    fireEvent.change(screen.getByLabelText(/^model$/i), { target: { value: 'Tesla Model 3' } });
    fireEvent.change(screen.getByLabelText(/^capacity$/i), { target: { value: '82' } });
    fireEvent.click(screen.getByRole('button', { name: /^add car$/i }));

    // Registering selects the car, so the pack capacity is now 82 kWh.
    fireEvent.change(screen.getByRole('slider', { name: /current battery/i }), { target: { value: '45' } });
    fireEvent.change(screen.getByRole('slider', { name: /target battery/i }), { target: { value: '90' } });
    fireEvent.change(screen.getByRole('slider', { name: /minimum battery/i }), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/efficiency/i), { target: { value: '17' } });

    expect(screen.getByText('Current battery: 36.9 kWh')).toBeInTheDocument();
    expect(screen.getByText('To reach target: +36.9 kWh')).toBeInTheDocument();
    expect(screen.getByText('Range to 10%: 169 km')).toBeInTheDocument();
  });

  it('recalculates when the capacity changes', () => {
    renderCalculator();
    fireEvent.change(screen.getByLabelText(/total battery capacity/i), { target: { value: '100' } });
    fireEvent.change(screen.getByRole('slider', { name: /current battery/i }), { target: { value: '50' } });
    expect(screen.getByText(/current battery: 50 kwh/i)).toBeInTheDocument();
  });

  it('shows a negative charge when the target is below the current level (PRD 8.2)', () => {
    renderCalculator();
    fireEvent.change(screen.getByRole('slider', { name: /current battery/i }), { target: { value: '80' } });
    fireEvent.change(screen.getByRole('slider', { name: /target battery/i }), { target: { value: '20' } });
    expect(screen.getByText(/to reach target: −/i)).toBeInTheDocument();
  });

  it('shows N/A when efficiency is cleared (PRD 2.2)', () => {
    renderCalculator();
    fireEvent.change(screen.getByLabelText(/efficiency/i), { target: { value: '' } });
    expect(screen.getByText('Range to minimum: N/A')).toBeInTheDocument();
  });

  it('shows the low-battery badge at or below 20%', () => {
    renderCalculator();
    expect(screen.queryByText(/low battery/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('slider', { name: /current battery/i }), { target: { value: '20' } });
    expect(screen.getAllByText(/low battery/i).length).toBeGreaterThan(0);
  });

  it('restores defaults when reset is pressed', () => {
    renderCalculator();
    fireEvent.change(screen.getByRole('slider', { name: /current battery/i }), { target: { value: '5' } });
    expect(screen.getByText(/current battery: 3.8 kwh/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }));

    expect(screen.getByRole('slider', { name: /current battery/i })).toHaveValue('50');
  });

  it('exposes every slider with an accessible name and value', () => {
    renderCalculator();
    for (const name of [/current battery/i, /target battery/i, /minimum battery/i]) {
      const slider = screen.getByRole('slider', { name });
      expect(slider).toHaveAttribute('aria-valuenow');
      expect(slider).toHaveAttribute('aria-valuetext');
    }
  });

  it('announces the results region politely', () => {
    const { container } = renderCalculator();
    expect(container.querySelector('dl[aria-live="polite"]')).toBeInTheDocument();
  });

  it('warns when persistence is unavailable (PRD 8.2)', () => {
    // MemoryStorageAdapter reports itself as non-durable, so the degradation
    // warning must appear and calculations must still work.
    render(<BatteryCalculator storage={new MemoryStorageAdapter()} />);

    expect(screen.getByRole('status')).toHaveTextContent(/storage is unavailable/i);
    fireEvent.change(screen.getByRole('slider', { name: /current battery/i }), { target: { value: '60' } });
    expect(screen.getByText(/current battery: 45 kwh/i)).toBeInTheDocument();
  });

  it('does not warn when storage is writable', () => {
    renderCalculator();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('supports keyboard interaction with the sliders', () => {
    renderCalculator();
    const slider = screen.getByRole('slider', { name: /current battery/i }) as HTMLInputElement;
    fireEvent.input(slider, { target: { value: '33' } });
    expect(slider.value).toBe('33');
  });
});
