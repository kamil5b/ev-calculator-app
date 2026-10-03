import { useState } from 'preact/hooks';
import type { RoadTrip } from '../../domain/entities/RoadTrip';
import { MAX_TRIP_NAME_LENGTH } from '../../domain/entities/RoadTrip';
import { VALIDATION_MESSAGES } from '../../domain/entities/validation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './common/Card';
import { Input } from './common/Input';
import { Button } from './common/Button';

export type SavedTripsSectionProps = {
  /** Saved trips, newest first. */
  trips: RoadTrip[];
  /** Saves the current plan under `name`; `false` = rejected (validation). */
  onSave: (name: string) => boolean;
  /** Replaces the current plan with the stored one. */
  onLoad: (id: string) => void;
  /** Overwrites the stored trip with the current plan. */
  onUpdate: (id: string) => boolean;
};

/**
 * Saved road trips card (PRD 11 extension): save the current plan under a
 * required name, load a stored one, or overwrite it with the current plan.
 *
 * Presentational like every component: the trip-name draft lives here, the
 * data and mutations live in the hook.
 */
export function SavedTripsSection({ trips, onSave, onLoad, onUpdate }: SavedTripsSectionProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  const handleSave = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError(VALIDATION_MESSAGES.tripNameRequired);
      return;
    }
    if (trimmed.length > MAX_TRIP_NAME_LENGTH) {
      setError(VALIDATION_MESSAGES.tripNameTooLong);
      return;
    }
    if (!onSave(trimmed)) {
      setError(VALIDATION_MESSAGES.tripNameRequired);
      return;
    }
    setName('');
    setError(undefined);
  };

  return (
    <Card aria-labelledby="saved-trips-heading">
      <CardHeader>
        <CardTitle id="saved-trips-heading">Saved trips</CardTitle>
        <CardDescription>
          Save the current plan under a name, load it back later, or overwrite a stored trip with
          what is on screen now.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div class="flex flex-wrap items-end gap-2">
          <Input
            label="Trip name"
            placeholder="Weekend trip"
            maxLength={MAX_TRIP_NAME_LENGTH}
            value={name}
            error={error}
            containerClassName="min-w-40 flex-1"
            onValueChange={(value) => {
              setName(value);
              setError(undefined);
            }}
          />
          <Button onClick={handleSave}>Save</Button>
        </div>

        {trips.length === 0 ? (
          <p class="text-sm text-slate-500">No saved trips yet</p>
        ) : (
          <ul class="space-y-2">
            {trips.map((trip) => (
              <li
                key={trip.id}
                class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
              >
                <p class="min-w-0 truncate text-sm font-medium text-slate-900">{trip.name}</p>

                <div class="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Load ${trip.name}`}
                    onClick={() => onLoad(trip.id)}
                  >
                    Load
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Update ${trip.name}`}
                    onClick={() => onUpdate(trip.id)}
                  >
                    Update
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
