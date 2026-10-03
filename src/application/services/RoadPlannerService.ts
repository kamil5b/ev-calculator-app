import type { BatteryState } from '../../domain/entities/BatteryState';
import { estimateRoadPlan } from '../../domain/use-cases/EstimateRoadPlan';
import { buildRoadPlanLabels, type RoadPlanResult } from '../dto/RoadPlanResult';

/**
 * Bridges the road plan use case and the view (PRD 11).
 *
 * Stateless like `BatteryCalculationService`: every call derives the result
 * from the current state, so the card can never show a stale plan.
 */
export class RoadPlannerService {
  estimate(state: BatteryState): RoadPlanResult {
    const estimate = estimateRoadPlan({
      plan: state.roadPlan,
      totalCapacity: state.totalCapacity,
      efficiency: state.efficiency,
      electricityRate: state.electricityRate,
      minBattery: state.minBattery,
    });

    return {
      available: estimate.available,
      points: estimate.points,
      labels: buildRoadPlanLabels(estimate, state.distanceUnit),
    };
  }
}

/** Shared instance — the service is stateless. */
export const roadPlannerService = new RoadPlannerService();
