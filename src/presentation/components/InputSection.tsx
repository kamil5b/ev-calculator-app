import type { BatteryState } from '../../domain/entities/BatteryState';
import { Card, CardContent, CardHeader, CardTitle } from './common/Card';
import { fromFieldValue, Input, toFieldValue } from './common/Input';
import { Slider } from './common/Slider';
import { efficiencyPresets } from '../../infrastructure/config/models';
import { efficiencyBounds, efficiencyUnitLabel } from '../../domain/entities/DistanceUnit';
import { ModelSelector } from './ModelSelector';
import type { CarModel } from '../../domain/entities/CarModel';
import type { CarModelDraftInput } from './ModelSelector';

export type InputSectionProps = {
  state: BatteryState;
  cars: CarModel[];
  errorFor: (field: string) => string | undefined;
  onCapacityChange: (value: number) => void;
  onCurrentBatteryChange: (value: number) => void;
  onTargetBatteryChange: (value: number) => void;
  onMinBatteryChange: (value: number) => void;
  onEfficiencyChange: (value: number | null) => void;
  onSelectCar: (id: string | null) => void;
  onAddCar: (draft: CarModelDraftInput) => boolean;
  onUpdateCar: (id: string, draft: CarModelDraftInput) => boolean;
  onRemoveCar: (id: string) => void;
};

/**
 * The vehicle and battery-level controls (PRD 5.1).
 *
 * Strictly presentational: every value is rendered as-is and every interaction is
 * reported upwards. The only derived text is the efficiency hint, which explains
 * the unit to first-time users without computing anything.
 */
export function InputSection({
  state,
  cars,
  errorFor,
  onCapacityChange,
  onCurrentBatteryChange,
  onTargetBatteryChange,
  onMinBatteryChange,
  onEfficiencyChange,
  onSelectCar,
  onAddCar,
  onUpdateCar,
  onRemoveCar,
}: InputSectionProps) {
  const bounds = efficiencyBounds(state.distanceUnit);

  return (
    <>
      <ModelSelector
        cars={cars}
        selectedId={state.carId}
        capacity={state.totalCapacity}
        onSelect={onSelectCar}
        onCapacityChange={onCapacityChange}
        onAdd={onAddCar}
        onUpdate={onUpdateCar}
        onRemove={onRemoveCar}
      />

      <Card>
        <CardHeader>
          <CardTitle>Battery levels</CardTitle>
        </CardHeader>

        <CardContent>
          <Slider
            label="Current battery"
            value={state.currentBattery}
            error={errorFor('currentBattery')}
            onValueChange={onCurrentBatteryChange}
          />

          <Slider
            label="Target battery"
            value={state.targetBattery}
            error={errorFor('targetBattery')}
            onValueChange={onTargetBatteryChange}
          />

          <Slider
            label="Minimum battery"
            value={state.minBattery}
            error={errorFor('minBattery')}
            onValueChange={onMinBatteryChange}
          />

          <Input
            label="Efficiency (optional)"
            type="number"
            inputMode="decimal"
            min={bounds.min}
            max={bounds.max}
            step={0.1}
            unit={efficiencyUnitLabel(state.distanceUnit)}
            value={toFieldValue(state.efficiency)}
            placeholder={state.distanceUnit === 'mi' ? '27.4' : '17'}
            error={errorFor('efficiency')}
            hint="Leave empty to skip the range calculation"
            presets={efficiencyPresets(state.distanceUnit)}
            onValueChange={(value) => onEfficiencyChange(fromFieldValue(value))}
          />
        </CardContent>
      </Card>
    </>
  );
}
