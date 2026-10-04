import { useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { RoadTrip } from '../../domain/entities/RoadTrip';
import { MAX_TRIP_NAME_LENGTH } from '../../domain/entities/RoadTrip';
import { VALIDATION_MESSAGES } from '../../domain/entities/validation';
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
  /** Deletes the stored trip; `false` = nothing was deleted. */
  onRemove: (id: string) => boolean;
  /** Downloads the stored trip as a JSON file (TRIP_EXPORT_IMPORT §7). */
  onExport: (id: string) => void;
  /** Imports a trip file's text; returns the error message, or null on success. */
  onImport: (json: string) => string | null;
};

/**
 * Saved road trips block (PRD 11 extension): sits at the head of the road
 * planner card — save the current plan under a required name, then load,
 * overwrite or delete each stored trip.
 *
 * Presentational like every component: the trip-name draft lives here, the
 * data and mutations live in the hook. Deletion uses the same inline
 * confirmation pattern as the car garage.
 */
export function SavedTripsSection({
  trips,
  onSave,
  onLoad,
  onUpdate,
  onRemove,
  onExport,
  onImport,
}: SavedTripsSectionProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | undefined>(undefined);
  const fileInput = useRef<HTMLInputElement>(null);

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
    setImportError(undefined);
  };

  /** Reads the picked file and hands its text to the hook (§7). */
  const handleFile = async (event: JSX.TargetedEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (file === undefined) return;

    setImportError(undefined);
    try {
      const text = await readFileText(file);
      const message = onImport(text);
      if (message !== null) setImportError(message);
    } catch {
      setImportError(VALIDATION_MESSAGES.tripImportInvalid);
    } finally {
      // Allow the same file to be picked again after a failed import.
      input.value = '';
    }
  };

  const confirmDelete = (trip: RoadTrip) => {
    onRemove(trip.id);
    setPendingDeleteId(null);
  };

  return (
    <>
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
        <Button variant="outline" onClick={() => fileInput.current?.click()}>
          Import
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          class="hidden"
          aria-label="Import trip file"
          onChange={(event) => void handleFile(event)}
        />
      </div>

      {importError !== undefined && (
        <p class="text-sm text-red-600" role="alert">
          {importError}
        </p>
      )}

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
                {pendingDeleteId === trip.id ? (
                  <>
                    <span class="text-xs text-slate-600">Delete {trip.name}?</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      aria-label={`Confirm delete ${trip.name}`}
                      onClick={() => confirmDelete(trip)}
                    >
                      Yes
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setPendingDeleteId(null)}>
                      No
                    </Button>
                  </>
                ) : (
                  <>
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
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Export ${trip.name}`}
                      onClick={() => onExport(trip.id)}
                    >
                      Export
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${trip.name}`}
                      onClick={() => setPendingDeleteId(trip.id)}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * Reads a picked file as text. `FileReader` rather than `File.text()`:
 * identical browser support, but also available in the jsdom test runner.
 */
function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsText(file);
  });
}
