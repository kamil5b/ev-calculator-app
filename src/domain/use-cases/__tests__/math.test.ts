import { describe, expect, it } from 'vitest';
import { clampPercent, round0, round1, sanitiseCapacity, sanitiseEfficiency } from '../math';

describe('math primitives', () => {
  describe('round1', () => {
    it('rounds to one decimal', () => {
      expect(round1(36.94)).toBe(36.9);
      expect(round1(36.96)).toBe(37);
    });

    it('normalises -0 and non-finite values to 0', () => {
      expect(Object.is(round1(-0.04), 0)).toBe(true);
      expect(round1(Number.NaN)).toBe(0);
      expect(round1(Number.POSITIVE_INFINITY)).toBe(0);
    });
  });

  describe('round0', () => {
    it('rounds to the nearest integer', () => {
      expect(round0(204.6)).toBe(205);
      expect(round0(204.4)).toBe(204);
    });

    it('normalises -0 and non-finite values to 0', () => {
      expect(Object.is(round0(-0.4), 0)).toBe(true);
      expect(round0(Number.NaN)).toBe(0);
    });
  });

  describe('clampPercent', () => {
    it('clamps into 0-100', () => {
      expect(clampPercent(-1)).toBe(0);
      expect(clampPercent(101)).toBe(100);
      expect(clampPercent(42.6)).toBe(42.6);
    });

    it('maps non-finite values to 0', () => {
      expect(clampPercent(Number.NaN)).toBe(0);
    });
  });

  describe('sanitiseCapacity', () => {
    it('drops negatives and non-finite values', () => {
      expect(sanitiseCapacity(-5)).toBe(0);
      expect(sanitiseCapacity(Number.NaN)).toBe(0);
      expect(sanitiseCapacity(82.5)).toBe(82.5);
    });
  });

  describe('sanitiseEfficiency', () => {
    it('keeps positive finite values', () => {
      expect(sanitiseEfficiency(17)).toBe(17);
    });

    it('returns null for null, undefined and non-positive values', () => {
      expect(sanitiseEfficiency(null)).toBeNull();
      expect(sanitiseEfficiency(undefined)).toBeNull();
      expect(sanitiseEfficiency(0)).toBeNull();
      expect(sanitiseEfficiency(-1)).toBeNull();
      expect(sanitiseEfficiency(Number.NaN)).toBeNull();
    });
  });
});
