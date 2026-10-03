import { useCalculator } from '../hooks/useCalculator';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { InputSection } from './InputSection';
import { OutputSection } from './OutputSection';
import { RoadPlannerSection } from './RoadPlannerSection';
import { UnitToggle } from './UnitToggle';
import { Button } from './common/Button';
import { Badge } from './common/Badge';
import type { StoragePort } from '../../infrastructure/storage/LocalStorageAdapter';

export type BatteryCalculatorProps = {
  /**
   * Storage override. Production leaves this unset; tests inject a
   * `MemoryStorageAdapter` to get hermetic runs.
   */
  storage?: StoragePort;
};

/**
 * Root island (PRD 5.1).
 *
 * Owns the only stateful hook in the tree and lays the single-column layout out.
 * It renders no calculations itself — everything below is fed by
 * `useCalculator`, which is the sole consumer of the application layer.
 */
export function BatteryCalculator({ storage }: BatteryCalculatorProps) {
  const calculator = useCalculator(storage);
  const installPrompt = useInstallPrompt();

  return (
    <div class="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-6 pb-8">
      <header class="flex flex-col gap-1">
        <div class="flex items-center justify-between gap-2">
          <h1 class="text-2xl font-bold tracking-tight text-slate-900">EV Battery Calculator</h1>
          {calculator.state.currentBattery <= 20 && <Badge variant="destructive">Low battery</Badge>}
        </div>
        <p class="text-sm text-slate-600">
          Remaining range, charge needed and pack energy — calculated on your device, no account required.
        </p>
        <UnitToggle value={calculator.state.distanceUnit} onChange={calculator.setDistanceUnit} />
      </header>

      {!calculator.storageAvailable && (
        <p
          class="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="status"
        >
          Storage is unavailable, so your values will be lost when you close this tab.
        </p>
      )}

      <main id="main" class="flex flex-col gap-4">
        <InputSection
          state={calculator.state}
          cars={calculator.cars}
          errorFor={calculator.errorFor}
          onCapacityChange={calculator.setCapacity}
          onCurrentBatteryChange={calculator.setCurrentBattery}
          onTargetBatteryChange={calculator.setTargetBattery}
          onMinBatteryChange={calculator.setMinBattery}
          onEfficiencyChange={calculator.setEfficiency}
          onElectricityRateChange={calculator.setElectricityRate}
          onTripDistanceChange={calculator.setTripDistance}
          onSelectCar={calculator.selectCar}
          onAddCar={calculator.addCar}
          onUpdateCar={calculator.updateCar}
          onRemoveCar={calculator.removeCar}
        />

        <OutputSection state={calculator.state} result={calculator.result} />

        <RoadPlannerSection
          state={calculator.state}
          result={calculator.roadPlanResult}
          errorFor={calculator.errorFor}
          trips={calculator.savedTrips}
          onInitialPercentChange={calculator.setRoadInitialPercent}
          onLegChange={calculator.setRoadLeg}
          onChargeToggle={calculator.setRoadCharge}
          onChargeToChange={calculator.setRoadChargeTo}
          onPointNameChange={calculator.setRoadPointName}
          onAddStop={calculator.addRoadStop}
          onRemoveStop={calculator.removeRoadStop}
          onSaveTrip={calculator.saveRoadTrip}
          onLoadTrip={calculator.loadRoadTrip}
          onUpdateTrip={calculator.updateRoadTrip}
          onRemoveTrip={calculator.removeRoadTrip}
          onReset={calculator.resetRoadPlan}
        />
      </main>

      <footer class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Button variant="outline" onClick={calculator.reset}>
            Reset
          </Button>
          {installPrompt.canInstall && (
            <Button onClick={() => void installPrompt.install()}>Install app</Button>
          )}
        </div>
        <p class="text-xs text-slate-500">Works fully offline</p>
      </footer>
    </div>
  );
}

export default BatteryCalculator;
