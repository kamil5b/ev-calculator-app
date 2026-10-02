import { describe, expect, it } from 'vitest';
import { displayName } from '../CarModel';
import type { CarModel } from '../CarModel';

const car = (overrides: Partial<CarModel> = {}): CarModel => ({
  id: 'car-1',
  model: 'Tesla Model 3',
  name: '',
  capacity: 82,
  createdAt: 1_696_118_400_000,
  ...overrides,
});

describe('displayName', () => {
  it('prefers the nickname when present (PRD 2.4.2)', () => {
    expect(displayName(car({ name: 'Daily driver' }))).toBe('Daily driver');
  });

  it('falls back to the model when the nickname is empty', () => {
    expect(displayName(car({ name: '' }))).toBe('Tesla Model 3');
  });

  it('falls back to the model when the nickname is only whitespace', () => {
    expect(displayName(car({ name: '   ' }))).toBe('Tesla Model 3');
  });

  it('trims the nickname', () => {
    expect(displayName(car({ name: '  Weekend car  ' }))).toBe('Weekend car');
  });
});
