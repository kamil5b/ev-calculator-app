import { describe, expect, it } from 'vitest';
import { formatCost, formatDistance, formatKWh, formatSignedKWh } from '../CalculationResult';
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

describe('formatDistance', () => {
  it('renders whole kilometres', () => {
    expect(formatDistance(204.6)).toBe('205 km');
  });

  it('renders zero without a sign', () => {
    expect(formatDistance(0)).toBe('0 km');
  });

  it('renders N/A for non-finite input', () => {
    expect(formatDistance(Number.NaN)).toBe(NOT_AVAILABLE);
  });

  it('renders whole miles when asked', () => {
    expect(formatDistance(104.6, 'mi')).toBe('105 mi');
  });
});

describe('formatCost', () => {
  it('always renders two decimals with the default symbol', () => {
    expect(formatCost(12.3)).toBe('CUR12.30');
    expect(formatCost(0)).toBe('CUR0.00');
  });

  it('prefixes the user-supplied symbol', () => {
    expect(formatCost(12.3, '€')).toBe('€12.30');
    expect(formatCost(12.3, 'IDR')).toBe('IDR12.30');
  });

  it('falls back to the default symbol when the input is blank', () => {
    expect(formatCost(12.3, '')).toBe('CUR12.30');
    expect(formatCost(12.3, '   ')).toBe('CUR12.30');
  });

  it('renders N/A for non-finite input', () => {
    expect(formatCost(Number.NaN)).toBe(NOT_AVAILABLE);
  });
});
