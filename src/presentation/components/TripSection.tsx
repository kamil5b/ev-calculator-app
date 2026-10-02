import type { CalculationResult } from '../../application/dto/CalculationResult';
import type { BatteryState } from '../../domain/entities/BatteryState';
import { efficiencyUnitLabel } from '../../domain/entities/DistanceUnit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './common/Card';
import { fromFieldValue, Input, toFieldValue } from './common/Input';

export type TripSectionProps = {
  state: BatteryState;
  result: CalculationResult;
  errorFor: (field: string) => string | undefined;
  onTripDistanceChange: (value: number | null) => void;
};

/**
 * Battery and charge estimators (PRD 10, Phase 2).
 *
 * Both answer "what happens when I reach that charger?" from the same inputs,
 * so they share one card. Consumption comes from the efficiency field in the
 * battery card, so there is a single source of truth for it.
 */
export function TripSection({ state, result, errorFor, onTripDistanceChange }: TripSectionProps) {
  const unit = state.distanceUnit;
  const efficiency = toFieldValue(state.efficiency);

  return (
    <Card aria-labelledby="trip-heading">
      <CardHeader>
        <CardTitle id="trip-heading">Trip estimate</CardTitle>
        <CardDescription>
          Battery left on arrival, and how much to charge there. Uses your current battery level.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Input
          label="Distance to target"
          type="number"
          inputMode="decimal"
          min={0}
          step={0.1}
          unit={unit}
          value={toFieldValue(state.tripDistance)}
          placeholder="10"
          error={errorFor('tripDistance')}
          hint={
            efficiency === ''
              ? 'Add an efficiency above to see the estimate'
              : `Uses your efficiency above (${efficiency} ${efficiencyUnitLabel(unit)})`
          }
          onValueChange={(value) => onTripDistanceChange(fromFieldValue(value))}
        />

        {result.labels.arrival !== null && result.labels.chargeAtTarget !== null && (
          <dl class="divide-y divide-slate-100" aria-live="polite" aria-atomic="true">
            <Line label="Battery on arrival" value={result.labels.arrival} warn={!result.trip?.isReachable} />
            <Line
              label="Charge at target"
              value={result.labels.chargeAtTarget}
              warn={!result.trip?.isReachable}
            />
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function Line({ label, value, warn }: { label: string; value: string; warn: boolean }) {
  return (
    <div class="flex flex-col gap-0.5 py-2.5">
      <dt class="text-sm text-slate-600">{label}</dt>
      <dd class={`text-base font-medium tabular-nums ${warn ? 'text-red-600' : 'text-slate-900'}`}>
        {value}
      </dd>
    </div>
  );
}
