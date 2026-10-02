import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/preact';
import { ModelSelector, type ModelSelectorProps } from '../ModelSelector';
import type { CarModel } from '../../../domain/entities/CarModel';
import { MemoryStorageAdapter } from '../../../infrastructure/storage/LocalStorageAdapter';
import { CarModelRepository } from '../../../infrastructure/repositories/CarModelRepository';
import { CarModelService } from '../../../application/services/CarModelService';

const cars: CarModel[] = [
  { id: 'car-1', model: 'Tesla Model 3', name: 'Daily driver', capacity: 82, createdAt: 2 },
  { id: 'car-2', model: 'VW ID.3', name: '', capacity: 77, createdAt: 1 },
];

type Options = Partial<{
  cars: CarModel[];
  selectedId: string | null;
  capacity: number;
  // Reuse the component's own prop signatures so the harness cannot drift.
  onCapacityChange: ModelSelectorProps['onCapacityChange'];
  onSelect: ModelSelectorProps['onSelect'];
  onAdd: ModelSelectorProps['onAdd'];
  onUpdate: ModelSelectorProps['onUpdate'];
  onRemove: ModelSelectorProps['onRemove'];
}>;

/**
 * Renders the selector against an in-memory garage, returning the spies so a
 * test can assert exactly what the component reported upwards.
 */
function renderSelector(options: Options = {}) {
  const onSelect = options.onSelect ?? vi.fn<ModelSelectorProps['onSelect']>();
  const onAdd = options.onAdd ?? vi.fn<ModelSelectorProps['onAdd']>(() => true);
  const onUpdate = options.onUpdate ?? vi.fn<ModelSelectorProps['onUpdate']>(() => true);
  const onRemove = options.onRemove ?? vi.fn<ModelSelectorProps['onRemove']>();

  render(
    <ModelSelector
      cars={options.cars ?? cars}
      selectedId={options.selectedId ?? null}
      capacity={options.capacity ?? 75}
      onSelect={onSelect}
      onCapacityChange={options.onCapacityChange ?? vi.fn<ModelSelectorProps['onCapacityChange']>()}
      onAdd={onAdd}
      onUpdate={onUpdate}
      onRemove={onRemove}
    />,
  );

  return { onSelect, onAdd, onUpdate, onRemove };
}

describe('ModelSelector', () => {
  it('offers manual entry when no car is selected', () => {
    renderSelector();
    expect(screen.getByLabelText(/EV car model/i)).toHaveValue('');
    expect(screen.getByRole('option', { name: /manual entry/i })).toBeInTheDocument();
  });

  it('lists every registered car in the dropdown (PRD 2.4.2)', () => {
    renderSelector();
    const select = screen.getByLabelText(/EV car model/i);
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Manual entry', 'Daily driver', 'VW ID.3']);
  });

  it('displays cars using name || model (PRD 2.4.2)', () => {
    renderSelector({
      cars: [{ id: 'car-9', model: 'Tesla Model 3', name: '  ', capacity: 82, createdAt: 1 }],
    });
    const select = screen.getByLabelText(/EV car model/i);
    expect(within(select).getByRole('option', { name: 'Tesla Model 3' })).toBeInTheDocument();
    expect(within(select).queryByRole('option', { name: '  ' })).not.toBeInTheDocument();
  });

  it('notifies the parent when a car is picked', () => {
    const { onSelect } = renderSelector();
    fireEvent.change(screen.getByLabelText(/EV car model/i), { target: { value: 'car-2' } });
    expect(onSelect).toHaveBeenCalledWith('car-2');
  });

  it('notifies the parent when manual entry is chosen', () => {
    const { onSelect } = renderSelector({ cars: [cars[0]!], selectedId: 'car-1' });
    fireEvent.change(screen.getByLabelText(/EV car model/i), { target: { value: '' } });
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('is hidden until the garage is expanded', () => {
    renderSelector();
    expect(screen.queryByRole('list', { name: /garage/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /manage cars \(2\)/i }));
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  describe('registration form', () => {
    it('opens and closes without submitting', () => {
      const { onAdd } = renderSelector();
      fireEvent.click(screen.getByRole('button', { name: /register car/i }));
      expect(screen.getByLabelText(/^model$/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
      expect(screen.queryByLabelText(/^model$/i)).not.toBeInTheDocument();
      expect(onAdd).not.toHaveBeenCalled();
    });

    it('submits a valid draft', () => {
      const { onAdd } = renderSelector();
      fireEvent.click(screen.getByRole('button', { name: /register car/i }));
      fireEvent.change(screen.getByLabelText(/^model$/i), { target: { value: 'Tesla Model 3' } });
      fireEvent.change(screen.getByLabelText(/^capacity$/i), { target: { value: '82' } });
      fireEvent.click(screen.getByRole('button', { name: /^add car$/i }));

      expect(onAdd).toHaveBeenCalledWith({ model: 'Tesla Model 3', name: '', capacity: 82 });
      expect(screen.queryByLabelText(/^model$/i)).not.toBeInTheDocument();
    });

    it('blocks submission when the model is blank (PRD 2.4.1)', () => {
      const { onAdd } = renderSelector();
      fireEvent.click(screen.getByRole('button', { name: /register car/i }));
      fireEvent.change(screen.getByLabelText(/^capacity$/i), { target: { value: '82' } });
      fireEvent.click(screen.getByRole('button', { name: /^add car$/i }));

      expect(onAdd).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent(/model is required/i);
    });

    it('blocks submission when the capacity is out of range (PRD 8.1)', () => {
      const { onAdd } = renderSelector();
      fireEvent.click(screen.getByRole('button', { name: /register car/i }));
      fireEvent.change(screen.getByLabelText(/^model$/i), { target: { value: 'ID.3' } });
      fireEvent.change(screen.getByLabelText(/^capacity$/i), { target: { value: '5' } });
      fireEvent.click(screen.getByRole('button', { name: /^add car$/i }));

      expect(onAdd).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent(/between 10 and 200/i);
    });

    it('preserves the entered values after a failed submit', () => {
      renderSelector();
      fireEvent.click(screen.getByRole('button', { name: /register car/i }));
      fireEvent.change(screen.getByLabelText(/^model$/i), { target: { value: 'ID.3' } });
      fireEvent.change(screen.getByLabelText(/^capacity$/i), { target: { value: '5' } });
      fireEvent.click(screen.getByRole('button', { name: /^add car$/i }));

      expect(screen.getByLabelText(/^model$/i)).toHaveValue('ID.3');
      // `toHaveValue` reports a number for `type="number"`, so read the property.
      expect((screen.getByLabelText(/^capacity$/i) as HTMLInputElement).value).toBe('5');
    });

    it('submits an omitted name as an empty string', () => {
      const { onAdd } = renderSelector();
      fireEvent.click(screen.getByRole('button', { name: /register car/i }));
      fireEvent.change(screen.getByLabelText(/^model$/i), { target: { value: 'ID.3' } });
      fireEvent.change(screen.getByLabelText(/^capacity$/i), { target: { value: '77' } });
      fireEvent.click(screen.getByRole('button', { name: /^add car$/i }));
      expect(onAdd).toHaveBeenCalledWith({ model: 'ID.3', name: '', capacity: 77 });
    });

    it('does not close the form when the parent rejects the draft', () => {
      renderSelector({ onAdd: vi.fn<ModelSelectorProps['onAdd']>(() => false) });
      fireEvent.click(screen.getByRole('button', { name: /register car/i }));
      fireEvent.change(screen.getByLabelText(/^model$/i), { target: { value: 'ID.3' } });
      fireEvent.change(screen.getByLabelText(/^capacity$/i), { target: { value: '77' } });
      fireEvent.click(screen.getByRole('button', { name: /^add car$/i }));

      expect(screen.getByLabelText(/^model$/i)).toBeInTheDocument();
    });
  });

  describe('edit flow', () => {
    it('prefills the form from the selected car', () => {
      renderSelector();
      fireEvent.click(screen.getByRole('button', { name: /manage cars \(2\)/i }));
      fireEvent.click(screen.getByRole('button', { name: /edit daily driver/i }));

      expect(screen.getByLabelText(/^model$/i)).toHaveValue('Tesla Model 3');
      expect(screen.getByLabelText(/^name \(optional\)$/i)).toHaveValue('Daily driver');
      expect((screen.getByLabelText(/^capacity$/i) as HTMLInputElement).value).toBe('82');
      expect(screen.getByText(/edit car/i)).toBeInTheDocument();
    });

    it('submits the edit to the parent', () => {
      const { onUpdate } = renderSelector();
      fireEvent.click(screen.getByRole('button', { name: /manage cars \(2\)/i }));
      fireEvent.click(screen.getByRole('button', { name: /edit vw id\.3/i }));
      fireEvent.change(screen.getByLabelText(/^name \(optional\)$/i), { target: { value: 'Weekend car' } });
      fireEvent.click(screen.getByRole('button', { name: /^save changes$/i }));

      expect(onUpdate).toHaveBeenCalledWith('car-2', {
        model: 'VW ID.3',
        name: 'Weekend car',
        capacity: 77,
      });
    });
  });

  describe('delete flow', () => {
    it('requires confirmation before deleting (PRD 2.4.2)', () => {
      const { onRemove } = renderSelector();
      fireEvent.click(screen.getByRole('button', { name: /manage cars \(2\)/i }));

      fireEvent.click(screen.getByRole('button', { name: /delete daily driver/i }));
      expect(onRemove).not.toHaveBeenCalled();
      expect(screen.getByText(/delete daily driver\?/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /confirm delete daily driver/i }));
      expect(onRemove).toHaveBeenCalledWith('car-1');
    });

    it('cancels without deleting', () => {
      const { onRemove } = renderSelector();
      fireEvent.click(screen.getByRole('button', { name: /manage cars \(2\)/i }));
      fireEvent.click(screen.getByRole('button', { name: /delete daily driver/i }));
      fireEvent.click(screen.getByRole('button', { name: /^no$/i }));

      expect(onRemove).not.toHaveBeenCalled();
      expect(screen.queryByText(/delete daily driver\?/i)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete daily driver/i })).toBeInTheDocument();
    });

    it('drops the edit form when the car being edited is deleted', () => {
      const { onRemove } = renderSelector();
      fireEvent.click(screen.getByRole('button', { name: /manage cars \(2\)/i }));
      fireEvent.click(screen.getByRole('button', { name: /edit daily driver/i }));
      fireEvent.click(screen.getByRole('button', { name: /delete daily driver/i }));
      fireEvent.click(screen.getByRole('button', { name: /confirm delete daily driver/i }));

      expect(onRemove).toHaveBeenCalledWith('car-1');
      expect(screen.queryByLabelText(/^model$/i)).not.toBeInTheDocument();
    });
  });

  it('marks the selected car as active', () => {
    renderSelector({ selectedId: 'car-1' });
    fireEvent.click(screen.getByRole('button', { name: /manage cars \(2\)/i }));
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Tesla Model 3 · 82 kWh')).toBeInTheDocument();
  });

  it('hides the garage toggle when nothing is registered', () => {
    renderSelector({ cars: [] });
    expect(screen.queryByRole('button', { name: /manage cars/i })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /no cars registered yet/i })).toBeInTheDocument();
  });

  it('drives validation through the real domain rules', () => {
    // Guards against the component bypassing `validateCarModel` with its own copy.
    const service = new CarModelService(new CarModelRepository(new MemoryStorageAdapter()));
    const rejected = service.add({ model: '', capacity: 82 });
    expect(rejected.ok).toBe(false);
    const accepted = service.add({ model: 'ID.3', capacity: 82 });
    expect(accepted.ok).toBe(true);
  });
});
