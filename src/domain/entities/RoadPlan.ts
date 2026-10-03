/**
 * Stored input for the EV Road Planner (PRD 11).
 *
 * A plan is a chain: start point, then one entry per following point (waypoint
 * or end). Leg *i* is the distance from point *i* to point *i+1*, and
 * `stops[i]` carries the charging intent for point *i+1*, so `legs.length ===
 * stops.length` and the point count is `legs.length + 1` (always ≥ 2).
 *
 * Only this input is persisted; arrivals, energy and prices are derived by
 * `estimateRoadPlan` and never stored.
 */
export interface RoadStop {
  /** Charge at this point at all (waypoints only — the end point never does). */
  readonly charging: boolean;
  /** Target state of charge when charging, 0–100. */
  readonly chargeTo: number;
}

export interface RoadPlan {
  /** Battery % when leaving the start point, 0–100. Independent of the battery slider. */
  readonly initialPercent: number;
  /** `legs[i]` = distance from point *i* to *i+1*; `null` = not filled in yet. */
  readonly legs: readonly (number | null)[];
  /** Charging intent for points 1…n, index-aligned with {@link legs}. */
  readonly stops: readonly RoadStop[];
}

/** Bounds a corrupt payload: at most 10 waypoints may be stored. */
export const MAX_ROAD_STOPS = 10;

/** First-run plan: start at 80 % with one empty leg to the end point. */
export const DEFAULT_ROAD_PLAN: RoadPlan = {
  initialPercent: 80,
  legs: [null],
  stops: [{ charging: false, chargeTo: 100 }],
};

/** Number of waypoints (points between start and end). */
export function waypointCount(plan: RoadPlan): number {
  return Math.max(0, plan.legs.length - 1);
}
