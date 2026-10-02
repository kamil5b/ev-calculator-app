import { CURRENCY_SYMBOL, type CalculationResult } from '../../application/dto/CalculationResult';
import type { BatteryState } from '../../domain/entities/BatteryState';
import { Card, CardContent, CardHeader, CardTitle } from './common/Card';
import { fromFieldValue, Input, toFieldValue } from './common/Input';

export type CostSectionProps = {
  state: BatteryState;
  result: CalculationResult;
  errorFor: (field: string) => string | undefined;
  onElectricityRateChange: (value: number | null) => void;
};

/** Price calculator: cost of charging to the target level (PRD 10, Phase 2). */
export function CostSection({ state, result, errorFor, onElectricityRateChange }: CostSectionProps) {
  return (
    <Card aria-labelledby="cost-heading">
      <CardHeader>
        <CardTitle id="cost-heading">Charging cost</CardTitle>
      </CardHeader>

      <CardContent>
        <Input
          label="Electricity price"
          type="number"
          inputMode="decimal"
          min={0}
          step={0.01}
          unit={`${CURRENCY_SYMBOL}/kWh`}
          value={toFieldValue(state.electricityRate)}
          placeholder="0.35"
          error={errorFor('electricityRate')}
          onValueChange={(value) => onElectricityRateChange(fromFieldValue(value))}
        />

        <p
          class={`text-base font-medium tabular-nums ${result.chargeCost === null ? 'text-slate-400' : 'text-slate-900'}`}
          aria-live="polite"
        >
          {result.labels.chargeCost}
        </p>
      </CardContent>
    </Card>
  );
}
