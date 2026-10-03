import { describe, expect, it } from 'vitest';
import { DEFAULT_ROAD_PLAN, roadPointName, type RoadPlan } from '../RoadPlan';

/** Start + one waypoint + end, with the start and end named. */
const plan: RoadPlan = {
  ...DEFAULT_ROAD_PLAN,
  legs: [100, null],
  stops: [
    { charging: false, chargeTo: 100 },
    { charging: false, chargeTo: 100 },
  ],
  names: ['Home', '', 'Office'],
};

describe('roadPointName', () => {
  it('prefers the custom name', () => {
    expect(roadPointName(plan, 0)).toBe('Home');
    expect(roadPointName(plan, 2)).toBe('Office');
  });

  it('falls back to the automatic label when the name is empty', () => {
    const blank: RoadPlan = { ...plan, names: ['', '', ''] };
    expect(roadPointName(blank, 0)).toBe('Start');
    expect(roadPointName(blank, 1)).toBe('Stop 1');
    expect(roadPointName(blank, 2)).toBe('End');
  });

  it('treats a whitespace-only name as empty', () => {
    expect(roadPointName({ ...plan, names: ['   ', '', ''] }, 0)).toBe('Start');
  });

  it('never throws on out-of-range indices', () => {
    expect(roadPointName(plan, -1)).toBe('Start');
    expect(roadPointName(plan, 99)).toBe('End');
  });
});
