import { describe, expect, it } from 'vitest';
import { validateRoadTrip } from '../ValidateRoadTrip';
import { MAX_TRIP_NAME_LENGTH, type RoadTripDraft } from '../../entities/RoadTrip';
import { VALIDATION_MESSAGES } from '../../entities/validation';

const draft = (name: string): RoadTripDraft => ({
  name,
  plan: { initialPercent: 80, legs: [null], stops: [{ charging: false, chargeTo: 100 }], names: ['', ''] },
  distanceUnit: 'km',
});

describe('validateRoadTrip', () => {
  it('accepts a normal name', () => {
    expect(validateRoadTrip(draft('Weekend trip'))).toEqual([]);
  });

  it('requires a name', () => {
    expect(validateRoadTrip(draft(''))).toEqual([
      { field: 'tripName', message: VALIDATION_MESSAGES.tripNameRequired },
    ]);
    expect(validateRoadTrip(draft('   '))).toEqual([
      { field: 'tripName', message: VALIDATION_MESSAGES.tripNameRequired },
    ]);
  });

  it('rejects a name longer than the limit', () => {
    const long = 'x'.repeat(MAX_TRIP_NAME_LENGTH + 1);
    expect(validateRoadTrip(draft(long))).toEqual([
      { field: 'tripName', message: VALIDATION_MESSAGES.tripNameTooLong },
    ]);
  });

  it('accepts a name exactly at the limit', () => {
    const exact = 'x'.repeat(MAX_TRIP_NAME_LENGTH);
    expect(validateRoadTrip(draft(exact))).toEqual([]);
  });
});
