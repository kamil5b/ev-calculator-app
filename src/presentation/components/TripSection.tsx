import type { CalculationResult } from '../../application/dto/CalculationResult';
import type { BatteryState } from '../../domain/entities/BatteryState';
import { efficiencyBounds, efficiencyUnitLabel } from '../../domain/entities/DistanceUnit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './common/Card';
import { fromFieldValue, Input, toFieldValue } from './common/Input';

export type TripSectionProps = {
  state: BatteryState;
  result: CalculationResult;
  errorFor: (field: string) => string | undefined;
  onTripDistanceChange: (value: number | null) => void;
  onTripEfficiencyChange: (value: number | null) => void;
};

/**
 * Battery and charge estimators (PRD 10, Phase 2).
 *
 * Both answer "what happens when I reach that charger?" from the same inputs,
 * so they share one card. The trip efficiency is an override: left empty it
 * uses the calculator's value, which the placeholder shows.
 */
export function TripSection({
  state,
  result,
  errorFor,
  onTripDistanceChange,
  onTripEfficiencyChange,
}: TripSectionProps) {
  const unit = state.distanceUnit;
  const bounds = efficiencyBounds(unit);
  const calculatorEfficiency = toFieldValue(state.efficiency);

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
          onValueChange={(value) => onTripDistanceChange(fromFieldValue(value))}
        />

        <Input
          label="Trip efficiency"
          type="number"
          inputMode="decimal"
          min={bounds.min}
          max={bounds.max}
          step={0.1}
          unit={efficiencyUnitLabel(unit)}
          value={toFieldValue(state.tripEfficiency)}
          placeholder={calculatorEfficiency}
          error={errorFor('tripEfficiency')}
          hint={
            calculatorEfficiency === ''
              ? 'Needed for the estimate, as the calculator has no efficiency'
              : 'Leave empty to use the calculator efficiency, or adjust for this trip (e.g. highway)'
          }
          onValueChange={(value) => onTripEfficiencyChange(fromFieldValue(value))}
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
