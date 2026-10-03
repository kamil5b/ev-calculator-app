import type { DistanceUnit } from './DistanceUnit';
import type { RoadPlan } from './RoadPlan';

/** A named road plan the user stored locally (PRD 11 extension). */
export interface RoadTrip {
  readonly id: string;
  /** User-chosen, required. */
  readonly name: string;
  /** The plan as it was when saved. */
  readonly plan: RoadPlan;
  /** Unit the legs were stored in — plans convert on load. */
  readonly distanceUnit: DistanceUnit;
  /** Epoch milliseconds, used for stable ordering. */
  readonly createdAt: number;
}

/** Fields a user supplies when saving a trip. */
export interface RoadTripDraft {
  readonly name: string;
  readonly plan: RoadPlan;
  readonly distanceUnit: DistanceUnit;
}

/** Bounds one trip name. */
export const MAX_TRIP_NAME_LENGTH = 60;
