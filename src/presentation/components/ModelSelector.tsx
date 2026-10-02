import { useState } from 'preact/hooks';
import { displayName, type CarModel } from '../../domain/entities/CarModel';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { Select } from './common/Select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './common/Card';
import { Badge } from './common/Badge';
import { CAPACITY_PRESETS } from '../../infrastructure/config/models';
import { validateCarModel } from '../../domain/use-cases/ValidateCarModel';
import { VALIDATION_MESSAGES, type FieldError } from '../../domain/entities/validation';
import { cn } from '../../lib/utils';

/** Payload accepted by the car registration and edit actions. */
export type CarModelDraftInput = { model: string; name?: string; capacity: number };

/** Actions the parent delegates down to the application layer. */
export type ModelSelectorProps = {
  cars: CarModel[];
  selectedId: string | null;
  capacity: number;
  onSelect: (id: string | null) => void;
  onCapacityChange: (capacity: number) => void;
  onAdd: (draft: CarModelDraftInput) => boolean;
  onUpdate: (id: string, draft: CarModelDraftInput) => boolean;
  onRemove: (id: string) => void;
};

/** Mutable form buffer; capacity stays a string so a cleared field is representable. */
type FormDraft = { model: string; name: string; capacity: string };

type FormMode = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; id: string };

const EMPTY_DRAFT: FormDraft = { model: '', name: '', capacity: '75' };

/**
 * Car selection and garage management (PRD 2.4.2).
 *
 * There is no catalogue to browse, so this component owns the whole lifecycle:
 * pick a registered car, register a new one, edit its details, or delete it with
 * an inline confirmation. The garage list is collapsible because on a 375px
 * screen it would otherwise push the calculator itself off-screen.
 *
 * Form input is buffered locally and only handed to the parent on submit, so a
 * half-typed model name never reaches `localStorage`.
 */
export function ModelSelector({
  cars,
  selectedId,
  capacity,
  onSelect,
  onCapacityChange,
  onAdd,
  onUpdate,
  onRemove,
}: ModelSelectorProps) {
  const [mode, setMode] = useState<FormMode>({ kind: 'closed' });
  const [showGarage, setShowGarage] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FormDraft>(EMPTY_DRAFT);
  const [formErrors, setFormErrors] = useState<FieldError[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const openCreate = () => {
    setDraft({ ...EMPTY_DRAFT, capacity: String(capacity) });
    setFormErrors([]);
    setSubmitError(null);
    setMode({ kind: 'create' });
  };

  const openEdit = (car: CarModel) => {
    setDraft({ model: car.model, name: car.name, capacity: String(car.capacity) });
    setFormErrors([]);
    setSubmitError(null);
    setMode({ kind: 'edit', id: car.id });
  };

  const closeForm = () => {
    setFormErrors([]);
    setSubmitError(null);
    setMode({ kind: 'closed' });
  };

  const setDraftField = (field: keyof FormDraft, value: string) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
  };

  const submit = (event: Event) => {
    event.preventDefault();
    const payload: CarModelDraftInput = {
      model: draft.model,
      name: draft.name,
      capacity: draft.capacity.trim() === '' ? Number.NaN : Number(draft.capacity),
    };

    const errors = validateCarModel(payload);
    if (errors.length > 0) {
      setFormErrors(errors);
      setSubmitError(null);
      return;
    }

    const saved = mode.kind === 'edit' ? onUpdate(mode.id, payload) : onAdd(payload);
    if (!saved) {
      setSubmitError(VALIDATION_MESSAGES.modelRequired);
      return;
    }

    closeForm();
    setShowGarage(true);
  };

  const confirmDelete = (car: CarModel) => {
    onRemove(car.id);
    setPendingDeleteId(null);
    if (mode.kind === 'edit' && mode.id === car.id) closeForm();
  };

  const errorFor = (field: string) => formErrors.find((error) => error.field === field)?.message;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle</CardTitle>
        <CardDescription>Pick a car you registered, or enter the capacity manually.</CardDescription>
      </CardHeader>

      <CardContent>
        <Select
          label="EV car model"
          value={selectedId ?? ''}
          onValueChange={(value) => onSelect(value === '' ? null : value)}
          options={[
            {
              value: '',
              label: cars.length === 0 ? 'No cars registered yet' : 'Manual entry',
            },
            ...cars.map((car) => ({ value: car.id, label: displayName(car) })),
          ]}
        />

        <Input
          label="Total battery capacity"
          type="number"
          inputMode="decimal"
          min={10}
          max={200}
          step={0.1}
          unit="kWh"
          value={Number.isFinite(capacity) ? String(capacity) : ''}
          presets={CAPACITY_PRESETS}
          onValueChange={(value) => onCapacityChange(value.trim() === '' ? Number.NaN : Number(value))}
          hint="Usable capacity, between 10 and 200 kWh"
        />

        <div class="flex flex-wrap items-center gap-2">
          {mode.kind === 'closed' ? (
            <>
              <Button variant="outline" size="sm" onClick={openCreate}>
                Register car
              </Button>
              {cars.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-expanded={showGarage}
                  aria-controls="garage-list"
                  onClick={() => setShowGarage((value) => !value)}
                >
                  {showGarage ? 'Hide cars' : `Manage cars (${cars.length})`}
                </Button>
              )}
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={closeForm}>
              Cancel
            </Button>
          )}
        </div>

        {mode.kind !== 'closed' && (
          <form
            class="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
            onSubmit={submit}
            // `novalidate` hands validation entirely to `validateCarModel`, which
            // renders the inline messages PRD 8.1 specifies. Without it the
            // browser's own bubbles would preempt them for empty or out-of-range
            // fields. `required`/`min`/`max` stay put: they still carry the
            // semantics assistive technology reads out.
            novalidate
          >
            <p class="text-sm font-medium text-slate-700">
              {mode.kind === 'edit' ? 'Edit car' : 'Register a new car'}
            </p>

            <Input
              label="Model"
              required
              value={draft.model}
              placeholder="Tesla Model 3"
              error={errorFor('model')}
              onValueChange={(value) => setDraftField('model', value)}
            />

            <Input
              label="Name (optional)"
              value={draft.name}
              placeholder="Daily driver"
              hint="Shown in the dropdown instead of the model when provided"
              onValueChange={(value) => setDraftField('name', value)}
            />

            <Input
              label="Capacity"
              type="number"
              inputMode="decimal"
              min={10}
              max={200}
              step={0.1}
              unit="kWh"
              required
              value={draft.capacity}
              presets={CAPACITY_PRESETS}
              error={errorFor('capacity')}
              onValueChange={(value) => setDraftField('capacity', value)}
            />

            {submitError !== null && (
              <p class="text-sm text-red-600" role="alert">
                {submitError}
              </p>
            )}

            <Button type="submit" size="sm">
              {mode.kind === 'edit' ? 'Save changes' : 'Add car'}
            </Button>
          </form>
        )}

        {showGarage && cars.length > 0 && (
          <ul id="garage-list" class="space-y-2">
            {cars.map((car) => (
              <li
                key={car.id}
                class={cn(
                  'flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2',
                  car.id === selectedId ? 'border-slate-900' : 'border-slate-200',
                )}
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-slate-900">{displayName(car)}</p>
                  <p class="truncate text-xs text-slate-500">
                    {car.model} · {car.capacity} kWh
                  </p>
                </div>

                <div class="flex shrink-0 items-center gap-1">
                  {car.id === selectedId && <Badge variant="success">Active</Badge>}

                  {pendingDeleteId === car.id ? (
                    <>
                      <span class="text-xs text-slate-600">Delete {displayName(car)}?</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        aria-label={`Confirm delete ${displayName(car)}`}
                        onClick={() => confirmDelete(car)}
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
                        aria-label={`Edit ${displayName(car)}`}
                        onClick={() => openEdit(car)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${displayName(car)}`}
                        onClick={() => setPendingDeleteId(car.id)}
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
      </CardContent>
    </Card>
  );
}
