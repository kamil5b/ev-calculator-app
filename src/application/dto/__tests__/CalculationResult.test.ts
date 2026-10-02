import { describe, expect, it } from 'vitest';
import { formatKm, formatKWh, formatSignedKWh } from '../CalculationResult';
import { NOT_AVAILABLE } from '../../../domain/entities/validation';

describe('formatKWh', () => {
  it('renders one decimal place', () => {
    expect(formatKWh(36.9)).toBe('36.9 kWh');
  });

  it('drops a trailing zero for whole values', () => {
    expect(formatKWh(41)).toBe('41 kWh');
    expect(formatKWh(41.0)).toBe('41 kWh');
  });

  it('rounds to one decimal', () => {
    expect(formatKWh(18.25)).toBe('18.3 kWh');
  });

  it('renders N/A for non-finite input', () => {
    expect(formatKWh(Number.NaN)).toBe(NOT_AVAILABLE);
  });
});

describe('formatSignedKWh', () => {
  it('prefixes a positive value with +', () => {
    expect(formatSignedKWh(36.9)).toBe('+36.9 kWh');
  });

  it('prefixes a negative value with a minus sign', () => {
    expect(formatSignedKWh(-36.9)).toBe('−36.9 kWh');
  });

  it('omits the sign for zero', () => {
    expect(formatSignedKWh(0)).toBe('0 kWh');
  });

  it('omits the sign when rounding lands on zero', () => {
    expect(formatSignedKWh(-0.04)).toBe('0 kWh');
    expect(formatSignedKWh(0.02)).toBe('0 kWh');
  });

  it('drops the trailing zero for whole magnitudes', () => {
    expect(formatSignedKWh(20)).toBe('+20 kWh');
    expect(formatSignedKWh(-20)).toBe('−20 kWh');
  });

  it('renders N/A for non-finite input', () => {
    expect(formatSignedKWh(Number.POSITIVE_INFINITY)).toBe(NOT_AVAILABLE);
  });
});

describe('formatKm', () => {
  it('renders whole kilometres', () => {
    expect(formatKm(204.6)).toBe('205 km');
  });

  it('renders zero without a sign', () => {
    expect(formatKm(0)).toBe('0 km');
  });

  it('renders N/A for non-finite input', () => {
    expect(formatKm(Number.NaN)).toBe(NOT_AVAILABLE);
  });
});
