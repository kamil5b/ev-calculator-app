import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { SavedTripsSection, type SavedTripsSectionProps } from '../SavedTripsSection';
import { VALIDATION_MESSAGES } from '../../../domain/entities/validation';
import { MAX_TRIP_NAME_LENGTH, type RoadTrip } from '../../../domain/entities/RoadTrip';
import { DEFAULT_ROAD_PLAN } from '../../../domain/entities/RoadPlan';

const trips: RoadTrip[] = [
  {
    id: 'trip-1',
    name: 'Weekend trip',
    plan: DEFAULT_ROAD_PLAN,
    distanceUnit: 'km',
    createdAt: 2,
  },
  {
    id: 'trip-2',
    name: 'Commute',
    plan: DEFAULT_ROAD_PLAN,
    distanceUnit: 'km',
    createdAt: 1,
  },
];

function renderSection(options: Partial<SavedTripsSectionProps> = {}) {
  const onSave = options.onSave ?? vi.fn<SavedTripsSectionProps['onSave']>(() => true);
  const onLoad = options.onLoad ?? vi.fn<SavedTripsSectionProps['onLoad']>();
  const onUpdate = options.onUpdate ?? vi.fn<SavedTripsSectionProps['onUpdate']>(() => true);
  const onRemove = options.onRemove ?? vi.fn<SavedTripsSectionProps['onRemove']>(() => true);

  render(
    <SavedTripsSection
      trips={options.trips ?? trips}
      onSave={onSave}
      onLoad={onLoad}
      onUpdate={onUpdate}
      onRemove={onRemove}
    />,
  );
  return { onSave, onLoad, onUpdate, onRemove };
}

describe('SavedTripsSection', () => {
  it('shows a hint when nothing is saved yet', () => {
    renderSection({ trips: [] });
    expect(screen.getByText('No saved trips yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load/i })).not.toBeInTheDocument();
  });

  it('lists every saved trip with load and update controls', () => {
    renderSection();
    expect(screen.getByText('Weekend trip')).toBeInTheDocument();
    expect(screen.getByText('Commute')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load Weekend trip' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update Weekend trip' })).toBeInTheDocument();
  });

  it('requires a trip name before saving', () => {
    const { onSave } = renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('alert')).toHaveTextContent(VALIDATION_MESSAGES.tripNameRequired);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves a trimmed name and clears the field', () => {
    const { onSave } = renderSection();
    fireEvent.change(screen.getByLabelText('Trip name'), { target: { value: '  Ski trip  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith('Ski trip');
    expect(screen.getByLabelText('Trip name')).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('rejects a name longer than the limit', () => {
    const { onSave } = renderSection();
    const long = 'x'.repeat(MAX_TRIP_NAME_LENGTH + 1);
    fireEvent.change(screen.getByLabelText('Trip name'), { target: { value: long } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByRole('alert')).toHaveTextContent(VALIDATION_MESSAGES.tripNameTooLong);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('keeps the field when the save is rejected', () => {
    const { onSave } = renderSection({ onSave: vi.fn<SavedTripsSectionProps['onSave']>(() => false) });
    fireEvent.change(screen.getByLabelText('Trip name'), { target: { value: 'Doomed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith('Doomed');
    expect(screen.getByLabelText('Trip name')).toHaveValue('Doomed');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('reports load and update with the trip id', () => {
    const { onLoad, onUpdate } = renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Load Weekend trip' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update Commute' }));

    expect(onLoad).toHaveBeenCalledWith('trip-1');
    expect(onUpdate).toHaveBeenCalledWith('trip-2');
  });

  it('asks before deleting, then reports the trip id', () => {
    const { onRemove } = renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Weekend trip' }));

    expect(screen.getByText('Delete Weekend trip?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete Weekend trip' }));

    expect(onRemove).toHaveBeenCalledWith('trip-1');
  });

  it('cancels a pending delete with No', () => {
    const { onRemove } = renderSection();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Weekend trip' }));
    fireEvent.click(screen.getByRole('button', { name: 'No' }));

    expect(screen.queryByText('Delete Weekend trip?')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Weekend trip' })).toBeInTheDocument();
    expect(onRemove).not.toHaveBeenCalled();
  });
});
