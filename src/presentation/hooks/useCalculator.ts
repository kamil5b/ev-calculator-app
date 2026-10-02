import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { createContainer, type Container } from '../../infrastructure/compositionRoot';
import type { StoragePort } from '../../infrastructure/storage/LocalStorageAdapter';
import { DEFAULT_BATTERY_STATE, type BatteryState } from '../../domain/entities/BatteryState';
import type { CarModel } from '../../domain/entities/CarModel';
import type { CalculationResult } from '../../application/dto/CalculationResult';
import { batteryCalculationService } from '../../application/services/BatteryCalculationService';
import { validateBatteryInputs } from '../../domain/use-cases/ValidateBatteryInputs';
import type { FieldError } from '../../domain/entities/validation';
import { clampPercent } from '../../domain/use-cases/math';
import { switchDistanceUnit } from '../../domain/use-cases/SwitchDistanceUnit';
import type { DistanceUnit } from '../../domain/entities/DistanceUnit';

/** What {@link useCalculator} hands to the components. */
export interface UseCalculator {
  readonly state: BatteryState;
  readonly result: CalculationResult;
  readonly errors: FieldError[];
  readonly cars: CarModel[];
  readonly activeCar: CarModel | null;
  readonly storageAvailable: boolean;
  readonly hydrated: boolean;
  setCapacity: (value: number) => void;
  setCurrentBattery: (value: number) => void;
  setTargetBattery: (value: number) => void;
  setMinBattery: (value: number) => void;
  setEfficiency: (value: number | null) => void;
  setDistanceUnit: (unit: DistanceUnit) => void;
  setTripDistance: (value: number | null) => void;
  setElectricityRate: (value: number | null) => void;
  selectCar: (id: string | null) => void;
  addCar: (draft: { model: string; name?: string; capacity: number }) => boolean;
  updateCar: (id: string, draft: { model: string; name?: string; capacity: number }) => boolean;
  removeCar: (id: string) => void;
  reset: () => void;
  errorFor: (field: string) => string | undefined;
}

/**
 * The only bridge between the UI and the application layer (PRD 3.2).
 *
 * Components never touch storage or arithmetic: they read derived values and
 * call these actions. Two concerns worth noting:
 *
 * 1. **Hydration.** State starts from hard-coded defaults so the server-rendered
 *    HTML and the first client render agree. Persisted values are applied in an
 *    effect, which avoids the hydration mismatch that reading `localStorage`
 *    during render would cause.
 * 2. **Persistence.** Every accepted state change is written back through
 *    `PersistenceService`; when the write fails the `storageAvailable` flag
 *    flips and the UI shows the warning described in PRD 8.2.
 */
export function useCalculator(storage?: StoragePort): UseCalculator {
  const containerRef = useRef<Container | null>(null);
  containerRef.current ??= storage === undefined ? createContainer() : createContainer(storage);

  const container = containerRef.current;
  const carsService = container.cars;
  const persistence = container.persistence;

  const [state, setState] = useState<BatteryState>({ ...DEFAULT_BATTERY_STATE });
  const [cars, setCars] = useState<CarModel[]>([]);
  const [storageAvailable, setStorageAvailable] = useState(container.storageAvailable);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const restored = persistence.load();
    const registeredCars = carsService.list();
    const activeId = carsService.getActiveId();
    const activeCar = activeId === null ? undefined : registeredCars.find((car) => car.id === activeId);

    setState(
      activeCar === undefined
        ? { ...restored, carId: null }
        : { ...restored, carId: activeCar.id, totalCapacity: activeCar.capacity },
    );
    setCars(registeredCars);
    setHydrated(true);
  }, [carsService, persistence]);

  /**
   * Persists every state change once hydration has finished.
   *
   * Keeping the write out of the setters means a half-typed value is never
   * normalised on its way into state — `validateBatteryInputs` has to see the raw
   * number in order to raise an inline error (PRD 8.1).
   */
  useEffect(() => {
    if (!hydrated) return;
    if (!persistence.save(state)) setStorageAvailable(false);
  }, [state, persistence, hydrated]);

  const patch = useCallback((changes: Partial<BatteryState>) => {
    setState((previous) => ({ ...previous, ...changes }));
  }, []);

  const setCapacity = useCallback((value: number) => patch({ totalCapacity: value }), [patch]);

  const setCurrentBattery = useCallback(
    (value: number) => patch({ currentBattery: clampPercent(Math.round(value)) }),
    [patch],
  );

  const setTargetBattery = useCallback(
    (value: number) => patch({ targetBattery: clampPercent(Math.round(value)) }),
    [patch],
  );

  const setMinBattery = useCallback(
    (value: number) => patch({ minBattery: clampPercent(Math.round(value)) }),
    [patch],
  );

  /**
   * Efficiency is optional, so `null` is a meaningful value rather than "unset":
   * passing it through verbatim is what makes the range read "N/A" (PRD 2.2).
   */
  const setEfficiency = useCallback((value: number | null) => patch({ efficiency: value }), [patch]);

  /** Converts every distance-shaped field so inputs and outputs stay in agreement. */
  const setDistanceUnit = useCallback(
    (unit: DistanceUnit) => setState((previous) => switchDistanceUnit(previous, unit)),
    [],
  );

  // The Phase 2 fields are optional like efficiency: `null` means "left empty".
  const setTripDistance = useCallback((value: number | null) => patch({ tripDistance: value }), [patch]);
  const setElectricityRate = useCallback(
    (value: number | null) => patch({ electricityRate: value }),
    [patch],
  );

  const selectCar = useCallback(
    (id: string | null) => {
      carsService.setActiveId(id);
      setCars(carsService.list());
      if (id === null) {
        patch({ carId: null });
        return;
      }
      const car = carsService.getById(id);
      patch(car === null ? { carId: null } : { carId: car.id, totalCapacity: car.capacity });
    },
    [carsService, patch],
  );

  const addCar = useCallback(
    (draft: { model: string; name?: string; capacity: number }) => {
      const outcome = carsService.add(draft);
      if (!outcome.ok) return false;

      // A newly registered car is immediately usable: selecting it keeps the
      // garage and the capacity field in sync, otherwise the user would add a
      // car and still have to find it in the dropdown.
      carsService.setActiveId(outcome.car.id);
      setCars(carsService.list());
      patch({ carId: outcome.car.id, totalCapacity: outcome.car.capacity });
      return true;
    },
    [carsService, patch],
  );

  const updateCar = useCallback(
    (id: string, draft: { model: string; name?: string; capacity: number }) => {
      const outcome = carsService.update(id, draft);
      if (!outcome.ok) return false;
      setCars(carsService.list());
      // Keep the calculator in sync when the edited car is the active one.
      setState((previous) =>
        previous.carId === id ? { ...previous, totalCapacity: outcome.car.capacity } : previous,
      );
      return true;
    },
    [carsService],
  );

  const removeCar = useCallback(
    (id: string) => {
      if (!carsService.remove(id)) return;
      setCars(carsService.list());
      setState((previous) => (previous.carId === id ? { ...previous, carId: null } : previous));
    },
    [carsService],
  );

  const reset = useCallback(() => {
    carsService.setActiveId(null);
    persistence.clear();
    setCars(carsService.list());
    setState({ ...DEFAULT_BATTERY_STATE });
  }, [carsService, persistence]);

  const result = batteryCalculationService.calculate(state);
  const errors = validateBatteryInputs(state);

  const errorFor = useCallback(
    (field: string) => errors.find((error) => error.field === field)?.message,
    [errors],
  );

  return {
    state,
    result,
    errors,
    cars,
    activeCar: cars.find((car) => car.id === state.carId) ?? null,
    storageAvailable,
    hydrated,
    setCapacity,
    setCurrentBattery,
    setTargetBattery,
    setMinBattery,
    setEfficiency,
    setDistanceUnit,
    setTripDistance,
    setElectricityRate,
    selectCar,
    addCar,
    updateCar,
    removeCar,
    reset,
    errorFor,
  };
}
