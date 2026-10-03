import { DEFAULT_ROAD_PLAN, type RoadPlan } from '../entities/RoadPlan';
import { calculateChargeCost } from './CalculateChargeCost';
import { clampPercent, round1, sanitiseCapacity, sanitiseEfficiency } from './math';

/** Everything the road plan is computed from. */
export interface RoadPlanInput {
  readonly plan: RoadPlan;
  /** Usable battery capacity in kWh. */
  readonly totalCapacity: number;
  /** Consumption per 100 distance units; `null` disables the plan. */
  readonly efficiency: number | null;
  /** Global price per kWh; `null` makes every charging price `N/A`. */
  readonly electricityRate: number | null;
  /** Reserve level the user wants to keep, 0–100 (warning threshold). */
  readonly minBattery: number;
}

/** Derived state of one point in the plan. */
export interface RoadPointEstimate {
  /** The first point: it has no arrival, only a departure. */
  readonly isStart: boolean;
  /** Typed distance from the previous point (`null` = empty). */
  readonly legDistance: number | null;
  /** Battery % on arrival, 1 decimal. `null` when the chain cannot reach here. */
  readonly arrivalPercent: number | null;
  /** Energy spent on this leg, 1 decimal kWh; `null` when not computable. */
  readonly legEnergyKWh: number | null;
  /** Battery % when leaving this point (after an optional charge). */
  readonly departurePercent: number | null;
  /** The car cannot make this leg (arrival < 0). */
  readonly unreachable: boolean;
  /** Arrival is ≥ 0 but below the reserve level — a warning, not an error. */
  readonly belowReserve: boolean;
  /** The stop's intent to charge here (start/end points never charge). */
  readonly charging: boolean;
  /** Energy bought here when charging; `null` when not charging / not computable. */
  readonly chargeKWh: number | null;
  /** Price of that energy; `null` when not charging, not computable, or no rate. */
  readonly chargeCost: number | null;
}

/** Aggregates for the summary line; `null` = nothing of that kind is known yet. */
export interface RoadPlanTotals {
  readonly totalDistance: number | null;
  readonly totalEnergyKWh: number | null;
  readonly totalChargeKWh: number | null;
  readonly totalChargeCost: number | null;
}

export interface RoadPlanEstimate {
  /** `false` without an efficiency (or a usable capacity): no numbers at all. */
  readonly available: boolean;
  /** One entry per point, start first. */
  readonly points: RoadPointEstimate[];
  readonly totals: RoadPlanTotals;
}

/**
 * Walks the plan point by point (PRD 11).
 *
 * Battery chains through the list: each departure is the previous arrival,
 * unless the stop charges — then it is the charge-to target. A leg with no
 * distance, a missing efficiency or an unreachable arrival breaks the chain,
 * so everything downstream reports `null` instead of a wrong number.
 *
 * Defensive like every use case: bad numbers degrade to `null`, never throw.
 */
export function estimateRoadPlan(input: RoadPlanInput): RoadPlanEstimate {
  const plan = input.plan ?? DEFAULT_ROAD_PLAN;
  const capacity = sanitiseCapacity(input.totalCapacity);
  const efficiency = sanitiseEfficiency(input.efficiency);
  const available = efficiency !== null && capacity > 0;
  const reserve = clampPercent(input.minBattery);

  const points: RoadPointEstimate[] = [
    {
      isStart: true,
      legDistance: null,
      arrivalPercent: null,
      legEnergyKWh: null,
      departurePercent: available ? clampPercent(plan.initialPercent) : null,
      unreachable: false,
      belowReserve: false,
      charging: false,
      chargeKWh: null,
      chargeCost: null,
    },
  ];

  let totalDistance: number | null = null;
  let totalEnergyKWh: number | null = null;
  let totalChargeKWh: number | null = null;
  let totalChargeCost: number | null = null;

  for (let index = 0; index < plan.legs.length; index += 1) {
    const distance = plan.legs[index] ?? null;
    const stop = plan.stops[index] ?? { charging: false, chargeTo: 100 };

    if (distance !== null && Number.isFinite(distance) && distance >= 0) {
      totalDistance = (totalDistance ?? 0) + distance;
    }

    // By construction `points[index]` exists (one entry is pushed per loop
    // iteration); the optional chain keeps the walk defensive regardless.
    const fromPercent = points[index]?.departurePercent ?? null;
    const legMissing =
      distance === null ||
      !Number.isFinite(distance) ||
      distance < 0 ||
      efficiency === null ||
      fromPercent === null;

    if (legMissing) {
      points.push(unreachedPoint(distance, stop));
      continue;
    }

    const legEnergyKWh = round1((distance * efficiency) / 100);
    const arrivalRaw = fromPercent - (legEnergyKWh / capacity) * 100;
    const unreachable = arrivalRaw < 0;
    const arrivalPercent = round1(arrivalRaw);
    totalEnergyKWh = (totalEnergyKWh ?? 0) + legEnergyKWh;

    const charging = stop.charging && !unreachable;
    // An unreachable arrival ends the chain: the car never makes it, so
    // nothing downstream can be computed (plan §5 — "Too far away" here,
    // "N/A" afterwards).
    const departurePercent = unreachable
      ? null
      : charging
        ? round1(Math.min(100, Math.max(arrivalPercent, clampPercent(stop.chargeTo))))
        : arrivalPercent;

    let chargeKWh: number | null = null;
    let chargeCost: number | null = null;
    if (charging && departurePercent !== null) {
      chargeKWh = round1(((departurePercent - arrivalPercent) / 100) * capacity);
      chargeCost = calculateChargeCost({ kWh: chargeKWh, ratePerKWh: input.electricityRate });
      totalChargeKWh = (totalChargeKWh ?? 0) + chargeKWh;
      if (chargeCost !== null) {
        totalChargeCost = round2((totalChargeCost ?? 0) + chargeCost);
      }
    }

    points.push({
      isStart: false,
      legDistance: distance,
      arrivalPercent,
      legEnergyKWh,
      departurePercent,
      unreachable,
      belowReserve: !unreachable && arrivalPercent < reserve,
      charging: stop.charging,
      chargeKWh,
      chargeCost,
    });
  }

  return {
    available,
    points,
    totals: { totalDistance, totalEnergyKWh, totalChargeKWh, totalChargeCost },
  };
}

/** Placeholder for a point the chain cannot reach (missing data or broken chain). */
function unreachedPoint(distance: number | null, stop: { charging: boolean; chargeTo: number }): RoadPointEstimate {
  return {
    isStart: false,
    legDistance: distance,
    arrivalPercent: null,
    legEnergyKWh: null,
    departurePercent: null,
    unreachable: false,
    belowReserve: false,
    charging: stop.charging,
    chargeKWh: null,
    chargeCost: null,
  };
}

/** Rounds to cents and normalises `-0`, matching `calculateChargeCost`. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100 || 0;
}
