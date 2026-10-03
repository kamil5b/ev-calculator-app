import type { BatteryState } from '../../domain/entities/BatteryState';
import type { RoadPlanResult } from '../../application/dto/RoadPlanResult';
import {
  MAX_POINT_NAME_LENGTH,
  MAX_ROAD_STOPS,
  roadPointName,
  waypointCount,
} from '../../domain/entities/RoadPlan';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './common/Card';
import { fromFieldValue, Input, toFieldValue } from './common/Input';
import { Slider } from './common/Slider';
import { Button } from './common/Button';
import { cn } from '../../lib/utils';

export type RoadPlannerSectionProps = {
  state: BatteryState;
  result: RoadPlanResult;
  errorFor: (field: string) => string | undefined;
  onInitialPercentChange: (value: number) => void;
  onLegChange: (index: number, value: number | null) => void;
  onChargeToggle: (index: number, charging: boolean) => void;
  onChargeToChange: (index: number, value: number) => void;
  onPointNameChange: (pointIndex: number, name: string) => void;
  onAddStop: () => void;
  onRemoveStop: (index: number) => void;
};

/**
 * EV Road Planner card (PRD 11).
 *
 * Strictly presentational: the plan input comes from `state.roadPlan`, every
 * number it shows is a pre-formatted label from `RoadPlanResult`, and each
 * interaction is reported upward. Point *i*'s row owns leg *i-1* and stop
 * *i-1* — the same index the actions expect.
 */
export function RoadPlannerSection({
  state,
  result,
  errorFor,
  onInitialPercentChange,
  onLegChange,
  onChargeToggle,
  onChargeToChange,
  onPointNameChange,
  onAddStop,
  onRemoveStop,
}: RoadPlannerSectionProps) {
  const plan = state.roadPlan;
  const unit = state.distanceUnit;

  /** The user's free text, or the automatic label (`Start`, `Stop 1`…, `End`). */
  const pointName = (pointIndex: number): string => roadPointName(plan, pointIndex);

  return (
    <Card aria-labelledby="road-heading">
      <CardHeader>
        <CardTitle id="road-heading">Road planner</CardTitle>
        <CardDescription>
          Start, optional stops, then the end point. Each distance is measured from the previous
          point.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!result.available && (
          <p class="text-sm text-slate-500">Add an efficiency above to see the estimate</p>
        )}

        <section class="space-y-2 rounded-lg border border-slate-200 p-3">
          <p class="text-sm font-semibold text-slate-900">{pointName(0)}</p>
          <Input
            label="Name"
            value={plan.names[0] ?? ''}
            placeholder={pointName(0)}
            maxLength={MAX_POINT_NAME_LENGTH}
            onValueChange={(value) => onPointNameChange(0, value)}
          />
          <Input
            label="Initial battery"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={1}
            unit="%"
            value={toFieldValue(plan.initialPercent)}
            error={errorFor('roadInitial')}
            hint="Independent of the battery level above"
            onValueChange={(value) =>
              onInitialPercentChange(fromFieldValue(value) ?? Number.NaN)
            }
          />
        </section>

        {plan.legs.map((leg, index) => {
          const pointIndex = index + 1;
          const isEnd = pointIndex === plan.legs.length;
          const stop = plan.stops[index] ?? { charging: false, chargeTo: 100 };
          const point = result.points[pointIndex];
          const labels = result.labels.points[pointIndex] ?? { arrival: null, charge: null };
          const name = pointName(pointIndex);

          return (
            <section key={pointIndex} class="space-y-3 rounded-lg border border-slate-200 p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-sm font-semibold text-slate-900">{name}</p>
                {!isEnd && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${name}`}
                    onClick={() => onRemoveStop(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>

              <Input
                label="Name"
                value={plan.names[pointIndex] ?? ''}
                placeholder={name}
                maxLength={MAX_POINT_NAME_LENGTH}
                onValueChange={(value) => onPointNameChange(pointIndex, value)}
              />

              <Input
                label={`Distance from ${pointName(pointIndex - 1)}`}
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                unit={unit}
                value={toFieldValue(leg)}
                placeholder="10"
                error={errorFor(`roadLeg${index}`)}
                onValueChange={(value) => onLegChange(index, fromFieldValue(value))}
              />

              <div class="flex items-baseline justify-between gap-3" aria-live="polite">
                <span class="text-sm text-slate-600">Battery on arrival</span>
                <span
                  class={cn(
                    'text-base font-medium tabular-nums',
                    point?.unreachable
                      ? 'text-red-600'
                      : point?.belowReserve
                        ? 'text-amber-600'
                        : 'text-slate-900',
                  )}
                >
                  {labels.arrival ?? ''}
                </span>
              </div>

              {!isEnd && (
                <>
                  <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={stop.charging}
                      class="h-4 w-4 rounded border-slate-300"
                      onChange={(event) => onChargeToggle(index, event.currentTarget.checked)}
                    />
                    Charge here
                  </label>

                  {stop.charging && (
                    <>
                      <Slider
                        label="Charge to"
                        value={stop.chargeTo}
                        min={Math.max(0, Math.floor(point?.arrivalPercent ?? 0))}
                        max={100}
                        error={errorFor(`roadChargeTo${index}`)}
                        onValueChange={(value) => onChargeToChange(index, value)}
                      />
                      <p
                        class={cn(
                          'text-sm font-medium tabular-nums',
                          point?.chargeKWh === null || point?.chargeCost === null
                            ? 'text-slate-400'
                            : 'text-slate-900',
                        )}
                        aria-live="polite"
                      >
                        {labels.charge ?? ''}
                      </p>
                    </>
                  )}
                </>
              )}
            </section>
          );
        })}

        {result.labels.totals !== null && (
          <p class="text-sm font-medium tabular-nums text-slate-900" aria-live="polite">
            {result.labels.totals}
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          disabled={waypointCount(plan) >= MAX_ROAD_STOPS}
          onClick={onAddStop}
        >
          Add stop
        </Button>
      </CardContent>
    </Card>
  );
}
