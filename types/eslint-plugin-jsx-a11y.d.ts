// eslint-plugin-jsx-a11y ships no type declarations. Declaring it here keeps
// `checkJs` on eslint.config.mjs honest instead of silencing the whole file.
declare module 'eslint-plugin-jsx-a11y' {
  import type { ESLint } from 'eslint';

  type FlatConfig = { rules?: ESLint.ConfigData['rules'] };

  const plugin: ESLint.Plugin & {
    // Named members are declared explicitly so `noUncheckedIndexedAccess` does
    // not force a guard on the configs we actually reference.
    flatConfigs: { recommended: FlatConfig; strict: FlatConfig } & Record<string, FlatConfig | undefined>;
  };

  export default plugin;
}
