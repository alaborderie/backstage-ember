import { emberTokens } from './tokens';

const { color: c, font, radius: r, motion: m, elevation: e } = emberTokens;

/**
 * BUI variables that Ember overrides, keyed by their exact name in
 * `@backstage/ui/css/styles.css`.
 */
export const buiVariables: Readonly<Record<`--bui-${string}`, string>> = {
  '--bui-font-regular': font.sans,
  '--bui-font-monospace': font.mono,
  '--bui-ring': c.emberFg,
  '--bui-scrollbar': 'transparent',
  '--bui-scrollbar-thumb': c.surface4,
  '--bui-bg-app': c.canvas,
  '--bui-bg-neutral-1': c.surface1,
  '--bui-bg-neutral-2': c.surface2,
  '--bui-bg-neutral-3': c.surface3,
  '--bui-bg-neutral-4': c.surface4,
  '--bui-fg-primary': c.fg1,
  '--bui-fg-secondary': c.fg2,
  '--bui-fg-disabled': c.lineInput,
  '--bui-fg-positive': c.ok,
  '--bui-fg-negative': c.danger,
  '--bui-fg-warning': c.warn,
  '--bui-fg-announcement': c.emberFg,
  '--bui-border-1': c.line1,
  '--bui-border-2': c.line2,
  '--bui-accent-bg': c.ember,
  '--bui-accent-bg-hover': c.emberPress,
  '--bui-accent-bg-disabled': c.surface3,
  '--bui-accent-fg': c.onEmber,
  '--bui-accent-fg-disabled': c.fg3,
  '--bui-announcement-bg': c.ember,
  '--bui-announcement-bg-hover': c.emberPress,
  '--bui-announcement-bg-subdued': c.emberSoft,
  '--bui-announcement-border': c.emberLine,
  '--bui-announcement-fg': c.onEmber,
  '--bui-announcement-fg-subdued': c.emberFg,
  '--bui-positive-bg': c.ok,
  '--bui-positive-bg-subdued': c.okSoft,
  '--bui-positive-border': c.ok,
  '--bui-positive-fg': c.canvas,
  '--bui-positive-fg-subdued': c.ok,
  '--bui-warning-bg': c.warn,
  '--bui-warning-bg-subdued': c.warnSoft,
  '--bui-warning-border': c.warn,
  '--bui-warning-fg': c.canvas,
  '--bui-warning-fg-subdued': c.warn,
  '--bui-negative-bg': c.danger,
  '--bui-negative-bg-subdued': c.dangerSoft,
  '--bui-negative-border': c.danger,
  '--bui-negative-fg': c.canvas,
  '--bui-negative-fg-subdued': c.danger,
  '--bui-radius-1': `${r.xs}px`,
  '--bui-radius-2': `${r.sm}px`,
  '--bui-radius-3': `${r.md}px`,
  '--bui-radius-4': `${r.lg}px`,
  '--bui-radius-5': `${r.xl}px`,
  '--bui-radius-6': `${r.xxl}px`,
  '--bui-shadow': e.e2,
};

/**
 * Ember tokens that have no BUI equivalent. Components read them with a BUI
 * fallback, for example `var(--ember-fg-tertiary, var(--bui-fg-secondary))`.
 */
export const emberVariables: Readonly<Record<`--ember-${string}`, string>> = {
  '--ember-fg-tertiary': c.fg3,
  '--ember-line-input': c.lineInput,
  '--ember-accent-fg': c.emberFg,
  '--ember-scrim': c.scrim,
  '--ember-info': c.info,
  '--ember-e-1': e.e1,
  '--ember-e-2': e.e2,
  '--ember-e-3': e.e3,
  '--ember-d-press': m.press,
  '--ember-d-fast': m.fast,
  '--ember-d-base': m.base,
  '--ember-d-slow': m.slow,
  '--ember-d-celebrate': m.celebrate,
  '--ember-ease-out': m.easeOut,
  '--ember-ease-inout': m.easeInOut,
  '--ember-ease-spring': m.spring,
  '--ember-target': '36px',
};

/**
 * The stylesheet the theme renders. It applies only while the Ember theme is
 * active, which upstream marks on `body` with `data-theme-name`.
 */
export function emberStylesheet(themeId: string): string {
  const scope = `body[data-theme-name='${themeId}']`;
  const declarations = Object.entries({ ...buiVariables, ...emberVariables })
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  return [
    `${scope} {\n${declarations}\n  color-scheme: dark;\n}`,
    `@media (pointer: coarse) { ${scope} { --ember-target: 44px; } }`,
    `${scope} { font-feature-settings: "ss01", "cv11"; -webkit-font-smoothing: antialiased; }`,
    `${scope} :focus-visible { outline: 2px solid ${c.emberFg}; outline-offset: 2px; }`,
    `${scope} ::selection { background: ${c.emberSoft}; }`,
  ].join('\n');
}
