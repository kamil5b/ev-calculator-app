import { convertEfficiency, type DistanceUnit } from '../../domain/entities/DistanceUnit';

/**
 * EV model database (PRD 2.4).
 *
 * **Intentionally empty.** Unlike earlier revisions of this product, the app
 * ships no built-in catalogue of vehicles: a battery capacity cannot be inferred
 * reliably from a model name (trim levels, packs and software variants differ),
 * and a wrong default would silently produce wrong range figures. Users register
 * their own cars instead, and those records live in `localStorage`.
 *
 * This module is the single place that would hold a catalogue if one were ever
 * introduced, so the "no hard-coded models" decision stays greppable.
 */

/** `false` = there is no built-in list; the UI must not offer a browse flow. */
export const HAS_BUILT_IN_CATALOGUE = false as const;

/**
 * Ready-made capacity values offered as one-tap chips in the registration form.
 *
 * These are numbers, not vehicles, so they carry no correctness risk: the user
 * still names the car themselves.
 */
export const CAPACITY_PRESETS: readonly number[] = [40, 58, 60, 75, 77, 82, 100] as const;

/** Ready-made consumption values (kWh/100km) matching common efficiency classes. */
export const EFFICIENCY_PRESETS: readonly number[] = [12, 15, 17, 20, 24] as const;

/**
 * {@link EFFICIENCY_PRESETS} in the given unit, one decimal, so the chips read
 * naturally in kWh/100mi (17 → 27.4) as well as kWh/100km.
 */
export function efficiencyPresets(unit: DistanceUnit): readonly number[] {
  return EFFICIENCY_PRESETS.map((preset) => Math.round(convertEfficiency(preset, 'km', unit) * 10) / 10);
}
