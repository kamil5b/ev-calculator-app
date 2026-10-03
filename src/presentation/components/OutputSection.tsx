import type { CalculationResult } from '../../application/dto/CalculationResult';
import type { BatteryState } from '../../domain/entities/BatteryState';
import { Card, CardContent, CardHeader, CardTitle } from './common/Card';
import { Badge } from './common/Badge';
import { efficiencyBounds, efficiencyUnitLabel } from '../../domain/entities/DistanceUnit';

/** State of charge below which the low-battery badge appears. */
const LOW_BATTERY_THRESHOLD = 20;

export type OutputSectionProps = {
  state: BatteryState;
  result: CalculationResult;
};

/**
 * Live calculation output (PRD 2.2), including the Phase 2 trip and price
 * answers so every number lives in a single card.
 *
 * Renders the pre-formatted strings produced by `BatteryCalculationService` so
 * no arithmetic or rounding leaks into the view. `aria-live="polite"` announces
 * each recalculation to screen readers without interrupting typing.
 */
export function OutputSection({ state, result }: OutputSectionProps) {
  const isLow = state.currentBattery <= LOW_BATTERY_THRESHOLD;
  const isDischarging = result.neededKWh < 0;
  const rangeUnavailable = result.range === null;
  const unit = result.distanceUnit;
  const bounds = efficiencyBounds(unit);
  const hasTrip = result.labels.arrival !== null && result.labels.chargeAtTarget !== null;
  const tripWarn = !result.trip?.isReachable;

  return (
    <Card aria-labelledby="output-heading">
      <CardHeader>
        <div class="flex items-center justify-between gap-2">
          <CardTitle id="output-heading">Results</CardTitle>
          {isLow && <Badge variant="destructive">Low battery</Badge>}
        </div>
      </CardHeader>

      <CardContent>
        <dl class="divide-y divide-slate-100" aria-live="polite" aria-atomic="true">
          <Row label={result.labels.currentKWh} value={`${result.currentKWh} kWh`} emphasis />
          <Row
            label={result.labels.neededKWh}
            value={`${result.neededKWh > 0 ? '+' : ''}${result.neededKWh} kWh`}
            tone={isDischarging ? 'neutral' : 'positive'}
          />
          <Row
            label={result.labels.range}
            value={rangeUnavailable ? 'N/A' : `${result.range} ${unit}`}
            tone={rangeUnavailable ? 'muted' : 'default'}
          />
          <Row label={result.labels.usableKWh} value={`${result.usableKWh} kWh`} />
          <Row
            label={result.labels.fullRange}
            value={result.fullRange === null ? 'N/A' : `${result.fullRange} ${unit}`}
            tone={result.fullRange === null ? 'muted' : 'default'}
          />
          {hasTrip && (
            <>
              <Row
                label="Battery on arrival"
                value={result.labels.arrival ?? ''}
                tone={tripWarn ? 'warning' : 'default'}
              />
              <Row
                label="Charge at target"
                value={result.labels.chargeAtTarget ?? ''}
                tone={tripWarn ? 'warning' : 'default'}
              />
            </>
          )}
        </dl>

        <p
          class={`text-base font-medium tabular-nums ${result.chargeCost === null ? 'text-slate-400' : 'text-slate-900'}`}
          aria-live="polite"
        >
          {result.labels.chargeCost}
        </p>

        <p class="text-xs text-slate-500">
          {result.range === null
            ? `Add an efficiency between ${bounds.min} and ${bounds.max} ${efficiencyUnitLabel(unit)} to see the range.`
            : `Range respects your ${state.minBattery}% reserve level.`}
        </p>
      </CardContent>
    </Card>
  );
}

type RowProps = {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: 'default' | 'muted' | 'positive' | 'neutral' | 'warning';
};

function Row({ label, value, emphasis = false, tone = 'default' }: RowProps) {
  const toneClass = {
    default: 'text-slate-900',
    muted: 'text-slate-400',
    positive: 'text-emerald-700',
    neutral: 'text-slate-900',
    warning: 'text-red-600',
  }[tone];

  return (
    <div class="flex items-baseline justify-between gap-3 py-2.5">
      <dt class="text-sm text-slate-600">{label}</dt>
      <dd class={`${emphasis ? 'text-xl font-semibold' : 'text-base font-medium'} ${toneClass} tabular-nums`}>
        {value}
      </dd>
    </div>
  );
}
