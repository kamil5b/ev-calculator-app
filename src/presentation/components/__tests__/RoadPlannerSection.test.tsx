import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { RoadPlannerSection, type RoadPlannerSectionProps } from '../RoadPlannerSection';
import { DEFAULT_BATTERY_STATE } from '../../../domain/entities/BatteryState';
import { roadPlannerService } from '../../../application/services/RoadPlannerService';
import { VALIDATION_MESSAGES } from '../../../domain/entities/validation';
import type { Place } from '../../../domain/entities/Place';

const BANDUNG: Place = { name: 'Bandung, Indonesia', lat: -6.9, lon: 107.6 };
const JAKARTA: Place = { name: 'Jakarta, Indonesia', lat: -6.2, lon: 106.8 };

function baseProps(): RoadPlannerSectionProps {
  return {
    state: DEFAULT_BATTERY_STATE,
    result: roadPlannerService.estimate(DEFAULT_BATTERY_STATE),
    errorFor: () => undefined,
    trips: [],
    placeMode: false,
    places: [null, null],
    placePlanning: false,
    placeError: null,
    onInitialPercentChange: vi.fn(),
    onLegChange: vi.fn(),
    onChargeToggle: vi.fn(),
    onChargeToChange: vi.fn(),
    onPointNameChange: vi.fn(),
    onAddStop: vi.fn(),
    onRemoveStop: vi.fn(),
    onSaveTrip: vi.fn(() => true),
    onLoadTrip: vi.fn(),
    onUpdateTrip: vi.fn(() => true),
    onRemoveTrip: vi.fn(() => true),
    onExportTrip: vi.fn(),
    onImportTrip: vi.fn(() => null),
    onReset: vi.fn(),
    onTogglePlaceMode: vi.fn(),
    onSearchPlaces: vi.fn(async () => ({ places: [], error: null })),
    onPlacePick: vi.fn(),
    onPlaceClear: vi.fn(),
    onFinishPlanning: vi.fn(async () => true),
    onCancelPlanning: vi.fn(),
  };
}

const renderSection = (overrides: Partial<RoadPlannerSectionProps> = {}) => {
  const props = { ...baseProps(), ...overrides };
  render(<RoadPlannerSection {...props} />);
  return props;
};

const setNavigatorOnLine = (value: boolean) =>
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  });

afterEach(() => {
  setNavigatorOnLine(true);
});

describe('RoadPlannerSection — place-mode toggle', () => {
  it('hides the toggle when offline', () => {
    setNavigatorOnLine(false);
    renderSection();
    expect(screen.queryByLabelText(/plan with actual place/i)).not.toBeInTheDocument();
  });

  it('shows the toggle online and reports clicks', () => {
    const props = renderSection();
    fireEvent.click(screen.getByLabelText(/plan with actual place/i));
    expect(props.onTogglePlaceMode).toHaveBeenCalledTimes(1);
  });
});

describe('RoadPlannerSection — place mode', () => {
  it('swaps Name fields for Place searches and disables manual inputs', () => {
    renderSection({ placeMode: true });

    expect(screen.getAllByLabelText('Place')).toHaveLength(2);
    expect(screen.queryAllByLabelText('Name')).toHaveLength(0);
    expect(screen.getByLabelText(/distance from start/i)).toBeDisabled();
    // Battery fields stay editable in place mode.
    expect(screen.getByLabelText(/initial battery/i)).not.toBeDisabled();
  });

  it('keeps Name fields enabled outside place mode', () => {
    renderSection();
    expect(screen.getAllByLabelText('Name')).toHaveLength(2);
    expect(screen.getByLabelText(/distance from start/i)).not.toBeDisabled();
    expect(screen.queryByLabelText('Place')).not.toBeInTheDocument();
  });

  it('blocks Done until every point has a place', () => {
    // Native buttons refuse clicks while disabled (jsdom's fireEvent would not,
    // so the disabled attribute itself is the contract to assert).
    renderSection({ placeMode: true, places: [BANDUNG, null] });
    expect(screen.getByRole('button', { name: /done planning/i })).toBeDisabled();
  });

  it('runs Done once every point has a place', () => {
    const props = renderSection({ placeMode: true, places: [BANDUNG, JAKARTA] });
    const button = screen.getByRole('button', { name: /done planning/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(props.onFinishPlanning).toHaveBeenCalledTimes(1);
  });

  it('disables Done and Cancel while a plan is in flight', () => {
    renderSection({ placeMode: true, places: [BANDUNG, JAKARTA], placePlanning: true });
    expect(screen.getByRole('button', { name: /done planning/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel planning/i })).toBeDisabled();
  });

  it('cancels planning', () => {
    const props = renderSection({ placeMode: true });
    fireEvent.click(screen.getByRole('button', { name: /cancel planning/i }));
    expect(props.onCancelPlanning).toHaveBeenCalledTimes(1);
  });

  it('renders the inline Done error', () => {
    renderSection({ placeMode: true, placeError: VALIDATION_MESSAGES.routeNetwork });
    expect(screen.getByRole('alert')).toHaveTextContent(VALIDATION_MESSAGES.routeNetwork);
  });

  it('hides the OSM credits outside place mode', () => {
    renderSection();
    expect(screen.queryByText(/openstreetmap contributors/i)).not.toBeInTheDocument();
  });

  it('shows the OSM credits under the totals in place mode', () => {
    renderSection({ placeMode: true });
    const credits = screen.getByText(/openstreetmap contributors/i);
    expect(credits).toBeInTheDocument();
    expect((credits as HTMLAnchorElement).href).toContain('openstreetmap.org');
  });
});

describe('RoadPlannerSection — PlaceSearchBar', () => {
  it('searches on button click and on Enter, then picks a result', async () => {
    const onSearchPlaces = vi.fn(async () => ({ places: [BANDUNG], error: null }));
    const props = renderSection({ placeMode: true, onSearchPlaces });

    const input = screen.getAllByLabelText('Place')[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'bandung' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Search' })[0] as HTMLElement);

    const pick = await screen.findByRole('button', { name: `Pick ${BANDUNG.name}` });
    expect(onSearchPlaces).toHaveBeenCalledWith('bandung');
    fireEvent.click(pick);
    expect(props.onPlacePick).toHaveBeenCalledWith(0, BANDUNG);

    // Enter in the second point's field triggers its own search.
    const second = screen.getAllByLabelText('Place')[1] as HTMLInputElement;
    fireEvent.change(second, { target: { value: 'jakarta' } });
    await waitFor(() => expect(second.value).toBe('jakarta'));
    fireEvent.keyDown(second, { key: 'Enter' });
    await waitFor(() => expect(onSearchPlaces).toHaveBeenCalledWith('jakarta'));
  });

  it('shows "No results" for an empty result set', async () => {
    renderSection({ placeMode: true });
    fireEvent.change(screen.getAllByLabelText('Place')[0] as HTMLInputElement, {
      target: { value: 'zzzz' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Search' })[0] as HTMLElement);
    expect(await screen.findByText(VALIDATION_MESSAGES.searchNoResults)).toBeInTheDocument();
  });

  it('shows the search error inline', async () => {
    const onSearchPlaces = vi.fn(async () => ({
      places: [],
      error: VALIDATION_MESSAGES.routeRateLimit,
    }));
    renderSection({ placeMode: true, onSearchPlaces });

    fireEvent.change(screen.getAllByLabelText('Place')[0] as HTMLInputElement, {
      target: { value: 'bandung' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Search' })[0] as HTMLElement);

    expect(await screen.findByRole('alert')).toHaveTextContent(VALIDATION_MESSAGES.routeRateLimit);
  });

  it('shows the picked place with a Clear action', () => {
    const props = renderSection({ placeMode: true, places: [BANDUNG, null] });
    expect(screen.getByText(BANDUNG.name)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: `Clear place ${BANDUNG.name}` }));
    expect(props.onPlaceClear).toHaveBeenCalledWith(0);
  });

  it('applies the 1 s cooldown after a search', async () => {
    renderSection({ placeMode: true });
    const searchButtons = () => screen.getAllByRole('button', { name: 'Search' }) as HTMLButtonElement[];

    fireEvent.change(screen.getAllByLabelText('Place')[0] as HTMLInputElement, {
      target: { value: 'bandung' },
    });
    fireEvent.click(searchButtons()[0] as HTMLElement);

    // During the request and through the cooldown the button stays disabled.
    await screen.findByText(VALIDATION_MESSAGES.searchNoResults);
    expect(searchButtons()[0]).toBeDisabled();

    await waitFor(() => expect(searchButtons()[0]).toBeEnabled(), { timeout: 2000 });
  }, 3000);
});
