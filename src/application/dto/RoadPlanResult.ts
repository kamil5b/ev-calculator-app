import type { DistanceUnit } from '../../domain/entities/DistanceUnit';
import { NOT_AVAILABLE } from '../../domain/entities/validation';
import type { RoadPlanEstimate, RoadPointEstimate } from '../../domain/use-cases/EstimateRoadPlan';
import { formatCost, formatDistance, formatKWh } from './CalculationResult';

/** Pre-rendered strings for one road plan point. */
export interface RoadPointLabels {
  /**
   * `"57%"`, `"⚠️ Too far away"` or `"N/A"`.
   * `null` = render nothing (the start point, or no efficiency entered).
   */
  readonly arrival: string | null;
  /** `"24.5 kWh · €8.57"` or `"N/A"`; `null` = not charging / end point. */
  readonly charge: string | null;
}

/** Pre-rendered strings for the plan summary. */
export interface RoadPlanLabels {
  readonly points: RoadPointLabels[];
  /** `"150 km · 25.5 kWh used · 24.5 kWh charged · €8.57"`; `null` = nothing computed. */
  readonly totals: string | null;
}

/** Everything the road planner card renders. */
export interface RoadPlanResult {
  /** `false` without efficiency: the card shows a hint instead of numbers. */
  readonly available: boolean;
  /** Derived point data (flags for tone: `unreachable`, `belowReserve`). */
  readonly points: RoadPointEstimate[];
  readonly labels: RoadPlanLabels;
}

/**
 * Turns the raw estimate into display strings (PRD 12: no formatting in views).
 *
 * The last point is the end of the trip — it never reports a charging session,
 * even if a corrupt payload claims otherwise.
 */
export function buildRoadPlanLabels(estimate: RoadPlanEstimate, unit: DistanceUnit): RoadPlanLabels {
  const lastIndex = estimate.points.length - 1;

  const points = estimate.points.map((point, index): RoadPointLabels => ({
    arrival: arrivalLabel(point, estimate.available),
    charge: chargeLabel(point, index === lastIndex),
  }));

  return { points, totals: totalsLabel(estimate, unit) };
}

function arrivalLabel(point: RoadPointEstimate, available: boolean): string | null {
  if (point.isStart || !available) return null;
  if (point.unreachable) return '⚠️ Too far away';
  if (point.arrivalPercent === null) return NOT_AVAILABLE;
  return `${Math.round(point.arrivalPercent)}%`;
}

function chargeLabel(point: RoadPointEstimate, isEnd: boolean): string | null {
  // The start/end never report a session; an uncharged waypoint hides the row;
  // charging with unknown numbers (broken chain, missing efficiency) shows N/A.
  if (point.isStart || isEnd || !point.charging) return null;
  if (point.chargeKWh === null) return NOT_AVAILABLE;
  return `${formatKWh(point.chargeKWh)} · ${
    point.chargeCost === null ? NOT_AVAILABLE : formatCost(point.chargeCost)
  }`;
}

function totalsLabel(estimate: RoadPlanEstimate, unit: DistanceUnit): string | null {
  const { totalDistance, totalEnergyKWh, totalChargeKWh, totalChargeCost } = estimate.totals;
  const parts: string[] = [];

  if (totalDistance !== null) parts.push(formatDistance(totalDistance, unit));
  if (totalEnergyKWh !== null) parts.push(`${formatKWh(totalEnergyKWh)} used`);
  if (totalChargeKWh !== null) {
    parts.push(`${formatKWh(totalChargeKWh)} charged`);
    parts.push(totalChargeCost === null ? NOT_AVAILABLE : formatCost(totalChargeCost));
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}
