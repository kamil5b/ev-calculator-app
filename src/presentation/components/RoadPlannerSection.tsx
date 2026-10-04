import { useEffect, useRef, useState } from 'preact/hooks';
import type { BatteryState } from '../../domain/entities/BatteryState';
import type { RoadPlanResult } from '../../application/dto/RoadPlanResult';
import type { RoadTrip } from '../../domain/entities/RoadTrip';
import type { Place } from '../../domain/entities/Place';
import {
  MAX_POINT_NAME_LENGTH,
  MAX_ROAD_STOPS,
  roadPointName,
  waypointCount,
} from '../../domain/entities/RoadPlan';
import { VALIDATION_MESSAGES } from '../../domain/entities/validation';
import type { PlaceSearchOutcome } from '../hooks/useCalculator';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './common/Card';
import { fromFieldValue, Input, toFieldValue } from './common/Input';
import { Slider } from './common/Slider';
import { Button } from './common/Button';
import { SavedTripsSection } from './SavedTripsSection';
import { cn } from '../../lib/utils';

export type RoadPlannerSectionProps = {
  state: BatteryState;
  result: RoadPlanResult;
  errorFor: (field: string) => string | undefined;
  /** Saved trips shown at the head of the card, newest first. */
  trips: RoadTrip[];
  /** "Plan with actual place" mode (ACTUAL_PLACE_PLANNING §6). */
  placeMode: boolean;
  /** Draft picks, index-aligned with the points. */
  places: readonly (Place | null)[];
  /** `true` while the `getLegs` request is in flight. */
  placePlanning: boolean;
  /** Inline error from the last "Done" attempt. */
  placeError: string | null;
  onInitialPercentChange: (value: number) => void;
  onLegChange: (index: number, value: number | null) => void;
  onChargeToggle: (index: number, charging: boolean) => void;
  onChargeToChange: (index: number, value: number) => void;
  onPointNameChange: (pointIndex: number, name: string) => void;
  onAddStop: () => void;
  onRemoveStop: (index: number) => void;
  onSaveTrip: (name: string) => boolean;
  onLoadTrip: (id: string) => void;
  onUpdateTrip: (id: string) => boolean;
  onRemoveTrip: (id: string) => boolean;
  onReset: () => void;
  onTogglePlaceMode: () => void;
  onSearchPlaces: (query: string) => Promise<PlaceSearchOutcome>;
  onPlacePick: (pointIndex: number, place: Place) => void;
  onPlaceClear: (pointIndex: number) => void;
  onFinishPlanning: () => Promise<boolean>;
  onCancelPlanning: () => void;
};

/**
 * EV Road Planner card (PRD 11 + ACTUAL_PLACE_PLANNING §6).
 *
 * Strictly presentational: the plan input comes from `state.roadPlan`, every
 * number it shows is a pre-formatted label from `RoadPlanResult`, and each
 * interaction is reported upward. Point *i*'s row owns leg *i-1* and stop
 * *i-1* — the same index the actions expect.
 *
 * In "plan with actual place" mode the Name field becomes a geocoder search,
 * and the distance/charge controls grey out until "Done" writes real legs
 * back into the ordinary, editable plan.
 */
export function RoadPlannerSection({
  state,
  result,
  errorFor,
  trips,
  placeMode,
  places,
  placePlanning,
  placeError,
  onInitialPercentChange,
  onLegChange,
  onChargeToggle,
  onChargeToChange,
  onPointNameChange,
  onAddStop,
  onRemoveStop,
  onSaveTrip,
  onLoadTrip,
  onUpdateTrip,
  onRemoveTrip,
  onReset,
  onTogglePlaceMode,
  onSearchPlaces,
  onPlacePick,
  onPlaceClear,
  onFinishPlanning,
  onCancelPlanning,
}: RoadPlannerSectionProps) {
  const plan = state.roadPlan;
  const unit = state.distanceUnit;
  const online = useOnlineStatus();

  /** The user's free text, or the automatic label (`Start`, `Stop 1`…, `End`). */
  const pointName = (pointIndex: number): string => roadPointName(plan, pointIndex);

  const allPicked = places.length >= 2 && places.every((entry) => entry !== null);

  return (
    <Card aria-labelledby="road-heading">
      <CardHeader>
        <CardTitle id="road-heading">Road planner</CardTitle>
        <CardDescription>
          Start, optional stops, then the end point. Each distance is measured from the previous point.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <SavedTripsSection
          trips={trips}
          onSave={onSaveTrip}
          onLoad={onLoadTrip}
          onUpdate={onUpdateTrip}
          onRemove={onRemoveTrip}
        />

        {online && (
          <label class="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={placeMode}
              class="h-4 w-4 rounded border-slate-300"
              onChange={onTogglePlaceMode}
            />
            Plan with actual place
          </label>
        )}

        <div class="border-t border-slate-200" />

        {!result.available && (
          <p class="text-sm text-slate-500">Add an efficiency above to see the estimate</p>
        )}

        <section class="space-y-2 rounded-lg border border-slate-200 p-3">
          <p class="text-sm font-semibold text-slate-900">{pointName(0)}</p>
          {placeMode ? (
            <PlaceSearchBar
              pointIndex={0}
              place={places[0] ?? null}
              onSearch={onSearchPlaces}
              onPick={onPlacePick}
              onClear={onPlaceClear}
            />
          ) : (
            <Input
              label="Name"
              value={plan.names[0] ?? ''}
              placeholder={pointName(0)}
              maxLength={MAX_POINT_NAME_LENGTH}
              onValueChange={(value) => onPointNameChange(0, value)}
            />
          )}
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
            onValueChange={(value) => onInitialPercentChange(fromFieldValue(value) ?? Number.NaN)}
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

              {placeMode ? (
                <PlaceSearchBar
                  pointIndex={pointIndex}
                  place={places[pointIndex] ?? null}
                  onSearch={onSearchPlaces}
                  onPick={onPlacePick}
                  onClear={onPlaceClear}
                />
              ) : (
                <Input
                  label="Name"
                  value={plan.names[pointIndex] ?? ''}
                  placeholder={name}
                  maxLength={MAX_POINT_NAME_LENGTH}
                  onValueChange={(value) => onPointNameChange(pointIndex, value)}
                />
              )}

              <Input
                label={`Distance from ${pointName(pointIndex - 1)}`}
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                unit={unit}
                value={toFieldValue(leg)}
                placeholder="10"
                disabled={placeMode}
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
                      disabled={placeMode}
                      class="h-4 w-4 rounded border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
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

        {/* Attribution for the online providers; update on provider swap. */}
        {placeMode && (
          <p class="text-xs text-slate-500">
            ©{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              class="underline hover:text-slate-700"
            >
              OpenStreetMap contributors
            </a>{' '}
            · Routing by OSRM
          </p>
        )}

        {placeMode && (
          <>
            {placeError !== null && (
              <p class="text-sm text-red-600" role="alert">
                {placeError}
              </p>
            )}
            <div class="flex flex-wrap gap-2">
              <Button
                disabled={!allPicked || placePlanning}
                loading={placePlanning}
                onClick={() => void onFinishPlanning()}
              >
                Done Planning with Actual Place
              </Button>
              <Button variant="ghost" size="sm" disabled={placePlanning} onClick={onCancelPlanning}>
                Cancel planning with actual place
              </Button>
            </div>
          </>
        )}

        <div class="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={waypointCount(plan) >= MAX_ROAD_STOPS}
            onClick={onAddStop}
          >
            Add stop
          </Button>
          <Button variant="ghost" size="sm" aria-label="Reset road planner" onClick={onReset}>
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Nominatim's public-usage cooldown lives here (1 s after each request). */
const SEARCH_COOLDOWN_MS = 1000;

type PlaceSearchBarProps = {
  pointIndex: number;
  place: Place | null;
  onSearch: (query: string) => Promise<PlaceSearchOutcome>;
  onPick: (pointIndex: number, place: Place) => void;
  onClear: (pointIndex: number) => void;
};

/**
 * One point's geocoder widget (ACTUAL_PLACE_PLANNING §6): search field with
 * no autocomplete, a Search button that also fires on Enter, the ≤5 results
 * with pick buttons, and the picked place with a Clear action. Search is
 * disabled for 1 s after every request (Nominatim allows 1 req/s).
 */
function PlaceSearchBar({ pointIndex, place, onSearch, onPick, onClear }: PlaceSearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (cooldownTimer.current !== null) clearTimeout(cooldownTimer.current);
    },
    [],
  );

  const runSearch = async () => {
    const trimmed = query.trim();
    if (trimmed === '' || searching || cooldown) return;

    setSearching(true);
    setError(null);
    try {
      const outcome = await onSearch(trimmed);
      setResults(outcome.places);
      setSearched(true);
      setError(outcome.error);
    } finally {
      setSearching(false);
      setCooldown(true);
      cooldownTimer.current = setTimeout(() => setCooldown(false), SEARCH_COOLDOWN_MS);
    }
  };

  return (
    <div class="space-y-2">
      {place !== null && (
        <div class="flex items-start justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p class="min-w-0 flex-1 whitespace-normal break-words text-sm font-medium text-emerald-900">
            {place.name}
          </p>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Clear place ${place.name}`}
            onClick={() => onClear(pointIndex)}
          >
            Clear
          </Button>
        </div>
      )}

      <div class="flex flex-wrap items-end gap-2">
        <Input
          label="Place"
          placeholder="Search a place"
          value={query}
          containerClassName="min-w-40 flex-1"
          onValueChange={(value) => setQuery(value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void runSearch();
            }
          }}
        />
        <Button
          variant="outline"
          loading={searching}
          disabled={query.trim() === '' || cooldown}
          onClick={() => void runSearch()}
        >
          Search
        </Button>
      </div>

      {error !== null && (
        <p class="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {error === null && searched && results.length === 0 && (
        <p class="text-sm text-slate-500">{VALIDATION_MESSAGES.searchNoResults}</p>
      )}

      {results.length > 0 && (
        <ul class="space-y-1" aria-label={`Results for point ${pointIndex}`}>
          {results.map((entry, index) => (
            <li
              key={`${entry.lat},${entry.lon}-${index}`}
              class="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
            >
              <p class="min-w-0 truncate text-sm text-slate-700">{entry.name}</p>
              <Button
                variant="outline"
                size="sm"
                aria-label={`Pick ${entry.name}`}
                onClick={() => onPick(pointIndex, entry)}
              >
                Pick
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
