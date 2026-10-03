import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { createContainer, type Container } from '../../infrastructure/compositionRoot';
import type { StoragePort } from '../../infrastructure/storage/LocalStorageAdapter';
import {
  DEFAULT_BATTERY_STATE,
  MAX_CURRENCY_SYMBOL_LENGTH,
  type BatteryState,
} from '../../domain/entities/BatteryState';
import { DEFAULT_ROAD_PLAN } from '../../domain/entities/RoadPlan';
import type { CarModel } from '../../domain/entities/CarModel';
import type { CalculationResult } from '../../application/dto/CalculationResult';
import { batteryCalculationService } from '../../application/services/BatteryCalculationService';
import { validateBatteryInputs } from '../../domain/use-cases/ValidateBatteryInputs';
import type { FieldError } from '../../domain/entities/validation';
import { clampPercent } from '../../domain/use-cases/math';
import { switchDistanceUnit } from '../../domain/use-cases/SwitchDistanceUnit';
import type { DistanceUnit } from '../../domain/entities/DistanceUnit';
import { MAX_POINT_NAME_LENGTH, MAX_ROAD_STOPS, type RoadPlan } from '../../domain/entities/RoadPlan';
import type { RoadTrip } from '../../domain/entities/RoadTrip';
import { convertDistance } from '../../domain/entities/DistanceUnit';
import { roadPlannerService } from '../../application/services/RoadPlannerService';
import type { RoadPlanResult } from '../../application/dto/RoadPlanResult';

/** What {@link useCalculator} hands to the components. */
export interface UseCalculator {
  readonly state: BatteryState;
  readonly result: CalculationResult;
  readonly errors: FieldError[];
  readonly cars: CarModel[];
  readonly activeCar: CarModel | null;
  readonly storageAvailable: boolean;
  readonly hydrated: boolean;
  /** Derived road planner output, recomputed on every render like `result`. */
  readonly roadPlanResult: RoadPlanResult;
  /** Saved road trips, newest first. */
  readonly savedTrips: RoadTrip[];
  setCapacity: (value: number) => void;
  setCurrentBattery: (value: number) => void;
  setTargetBattery: (value: number) => void;
  setMinBattery: (value: number) => void;
  setEfficiency: (value: number | null) => void;
  setDistanceUnit: (unit: DistanceUnit) => void;
  setTripDistance: (value: number | null) => void;
  setElectricityRate: (value: number | null) => void;
  setCurrencySymbol: (value: string) => void;
  setRoadInitialPercent: (value: number) => void;
  setRoadLeg: (index: number, value: number | null) => void;
  setRoadCharge: (index: number, charging: boolean) => void;
  setRoadChargeTo: (index: number, value: number) => void;
  setRoadPointName: (pointIndex: number, name: string) => void;
  addRoadStop: () => void;
  removeRoadStop: (index: number) => void;
  saveRoadTrip: (name: string) => boolean;
  loadRoadTrip: (id: string) => void;
  updateRoadTrip: (id: string) => boolean;
  removeRoadTrip: (id: string) => boolean;
  resetRoadPlan: () => void;
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
  const tripsService = container.trips;
  const persistence = container.persistence;

  const [state, setState] = useState<BatteryState>({ ...DEFAULT_BATTERY_STATE });
  const [cars, setCars] = useState<CarModel[]>([]);
  const [savedTrips, setSavedTrips] = useState<RoadTrip[]>([]);
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
    setSavedTrips(tripsService.list());
    setHydrated(true);
  }, [carsService, tripsService, persistence]);

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

  /**
   * Free text, trimmed and capped rather than validated: a blank value is
   * tolerated so the field stays editable, and every renderer falls back to
   * the placeholder (see `resolveCurrencySymbol`).
   */
  const setCurrencySymbol = useCallback(
    (value: string) => patch({ currencySymbol: value.trim().slice(0, MAX_CURRENCY_SYMBOL_LENGTH) }),
    [patch],
  );

  // Road planner (PRD 11): every action rewrites only its own slice of the
  // plan; legs and stops stay index-aligned by construction.
  const setRoadInitialPercent = useCallback(
    (value: number) =>
      setState((previous) => ({
        ...previous,
        roadPlan: { ...previous.roadPlan, initialPercent: value },
      })),
    [],
  );

  const setRoadLeg = useCallback((index: number, value: number | null) => {
    setState((previous) => ({
      ...previous,
      roadPlan: {
        ...previous.roadPlan,
        legs: previous.roadPlan.legs.map((leg, legIndex) => (legIndex === index ? value : leg)),
      },
    }));
  }, []);

  const patchRoadStop = useCallback((index: number, changes: Partial<RoadPlan['stops'][number]>) => {
    setState((previous) => ({
      ...previous,
      roadPlan: {
        ...previous.roadPlan,
        stops: previous.roadPlan.stops.map((stop, stopIndex) =>
          stopIndex === index ? { ...stop, ...changes } : stop,
        ),
      },
    }));
  }, []);

  const setRoadCharge = useCallback(
    (index: number, charging: boolean) => patchRoadStop(index, { charging }),
    [patchRoadStop],
  );

  const setRoadChargeTo = useCallback(
    (index: number, value: number) => patchRoadStop(index, { chargeTo: value }),
    [patchRoadStop],
  );

  /** Free-text name for a point (start = 0); rebuilt to keep the array aligned
   * with the points, so a stale payload can never swallow the edit. */
  const setRoadPointName = useCallback((pointIndex: number, name: string) => {
    setState((previous) => ({
      ...previous,
      roadPlan: {
        ...previous.roadPlan,
        names: Array.from({ length: previous.roadPlan.legs.length + 1 }, (_, index) =>
          index === pointIndex
            ? name.slice(0, MAX_POINT_NAME_LENGTH)
            : (previous.roadPlan.names[index] ?? ''),
        ),
      },
    }));
  }, []);

  /** Inserts a waypoint immediately before the end point. */
  const addRoadStop = useCallback(() => {
    setState((previous) => {
      const plan = previous.roadPlan;
      if (plan.legs.length - 1 >= MAX_ROAD_STOPS) return previous;
      const insertAt = Math.max(0, plan.legs.length - 1);
      return {
        ...previous,
        roadPlan: {
          ...plan,
          legs: [...plan.legs.slice(0, insertAt), null, ...plan.legs.slice(insertAt)],
          stops: [
            ...plan.stops.slice(0, insertAt),
            { charging: false, chargeTo: 100 },
            ...plan.stops.slice(insertAt),
          ],
          // The new waypoint is point `insertAt + 1`; it starts unnamed.
          names: Array.from({ length: plan.legs.length + 2 }, (_, pointIndex) =>
            pointIndex === insertAt + 1 ? '' : (plan.names[pointIndex] ?? ''),
          ),
        },
      };
    });
  }, []);

  /** Removes waypoint `index` (its leg index); the start/end are untouchable. */
  const removeRoadStop = useCallback((index: number) => {
    setState((previous) => {
      const plan = previous.roadPlan;
      if (plan.legs.length <= 1) return previous;
      return {
        ...previous,
        roadPlan: {
          ...plan,
          legs: plan.legs.filter((_, legIndex) => legIndex !== index),
          stops: plan.stops.filter((_, stopIndex) => stopIndex !== index),
          // Dropping the waypoint drops point `index + 1`; the rest shift down.
          names: Array.from(
            { length: plan.legs.length },
            (_, pointIndex) => plan.names[pointIndex < index + 1 ? pointIndex : pointIndex + 1] ?? '',
          ),
        },
      };
    });
  }, []);

  /** Saves the current plan under a required, user-chosen name. */
  const saveRoadTrip = useCallback(
    (name: string): boolean => {
      const outcome = tripsService.add({
        name,
        plan: state.roadPlan,
        distanceUnit: state.distanceUnit,
      });
      if (!outcome.ok) return false;
      setSavedTrips(tripsService.list());
      return true;
    },
    [tripsService, state.roadPlan, state.distanceUnit],
  );

  /** Replaces the current plan with a stored one, converting legs to the active unit. */
  const loadRoadTrip = useCallback(
    (id: string): void => {
      const trip = tripsService.getById(id);
      if (trip === null) return;

      setState((previous) => ({
        ...previous,
        roadPlan: {
          ...trip.plan,
          legs: trip.plan.legs.map((leg) =>
            leg === null || trip.distanceUnit === previous.distanceUnit
              ? leg
              : convertDistance(leg, trip.distanceUnit, previous.distanceUnit),
          ),
        },
      }));
    },
    [tripsService],
  );

  /** Overwrites a stored trip with the current plan (name and id preserved). */
  const updateRoadTrip = useCallback(
    (id: string): boolean => {
      const outcome = tripsService.update(id, {
        plan: state.roadPlan,
        distanceUnit: state.distanceUnit,
      });
      if (!outcome.ok) return false;
      setSavedTrips(tripsService.list());
      return true;
    },
    [tripsService, state.roadPlan, state.distanceUnit],
  );

  /** Deletes a saved trip from the library. */
  const removeRoadTrip = useCallback(
    (id: string): boolean => {
      if (!tripsService.remove(id)) return false;
      setSavedTrips(tripsService.list());
      return true;
    },
    [tripsService],
  );

  /** Restores the planner to the first-run plan; saved trips are untouched. */
  const resetRoadPlan = useCallback(() => {
    setState((previous) => ({
      ...previous,
      roadPlan: {
        ...DEFAULT_ROAD_PLAN,
        legs: [...DEFAULT_ROAD_PLAN.legs],
        stops: DEFAULT_ROAD_PLAN.stops.map((stop) => ({ ...stop })),
        names: [...DEFAULT_ROAD_PLAN.names],
      },
    }));
  }, []);

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
  const roadPlanResult = roadPlannerService.estimate(state);
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
    roadPlanResult,
    savedTrips,
    setCapacity,
    setCurrentBattery,
    setTargetBattery,
    setMinBattery,
    setEfficiency,
    setDistanceUnit,
    setTripDistance,
    setElectricityRate,
    setCurrencySymbol,
    setRoadInitialPercent,
    setRoadLeg,
    setRoadCharge,
    setRoadChargeTo,
    setRoadPointName,
    addRoadStop,
    removeRoadStop,
    saveRoadTrip,
    loadRoadTrip,
    updateRoadTrip,
    removeRoadTrip,
    resetRoadPlan,
    selectCar,
    addCar,
    updateCar,
    removeCar,
    reset,
    errorFor,
  };
}
