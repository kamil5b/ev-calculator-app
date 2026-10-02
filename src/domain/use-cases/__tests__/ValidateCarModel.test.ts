import { describe, expect, it } from 'vitest';
import { isCarModelValid, validateCarModel } from '../ValidateCarModel';
import { VALIDATION_MESSAGES } from '../../entities/validation';

describe('ValidateCarModel', () => {
  it('accepts a model with a capacity only', () => {
    expect(isCarModelValid({ model: 'Tesla Model 3', capacity: 82 })).toBe(true);
  });

  it('accepts an optional name', () => {
    expect(isCarModelValid({ model: 'Tesla Model 3', name: 'Daily driver', capacity: 82.5 })).toBe(true);
  });

  it('requires a model (PRD 2.4.1)', () => {
    expect(validateCarModel({ model: '   ', capacity: 82 })).toEqual([
      { field: 'model', message: VALIDATION_MESSAGES.modelRequired },
    ]);
  });

  it('accepts fractional capacities inside the range', () => {
    expect(isCarModelValid({ model: 'ID.3', capacity: 82.5 })).toBe(true);
  });

  it('rejects a capacity below 10 kWh', () => {
    expect(validateCarModel({ model: 'ID.3', capacity: 9.9 })).toEqual([
      { field: 'capacity', message: VALIDATION_MESSAGES.capacityRange },
    ]);
  });

  it('rejects a capacity above 200 kWh', () => {
    expect(validateCarModel({ model: 'Semi', capacity: 200.1 })).toHaveLength(1);
  });

  it('accepts the range boundaries', () => {
    expect(isCarModelValid({ model: 'Small', capacity: 10 })).toBe(true);
    expect(isCarModelValid({ model: 'Huge', capacity: 200 })).toBe(true);
  });

  it('rejects a non-numeric capacity', () => {
    expect(validateCarModel({ model: 'ID.3', capacity: Number.NaN })).toEqual([
      { field: 'capacity', message: VALIDATION_MESSAGES.notANumber },
    ]);
  });

  it('reports both problems together', () => {
    expect(validateCarModel({ model: '', capacity: 1 }).map((error) => error.field)).toEqual([
      'model',
      'capacity',
    ]);
  });
});
