import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/preact';

/**
 * JSDOM does not implement these, and the slider plus the storage adapter both
 * touch them. Stubbing here keeps every test file free of environment setup.
 */
if (!('matchMedia' in window)) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
