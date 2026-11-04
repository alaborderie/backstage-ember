/**
 * The Ember design tokens. Every color, radius, font and motion value the
 * theme and the widgets use comes from here.
 *
 * @public
 */
export const emberTokens = {
  color: {
    canvas: '#0F0E0E',
    surface1: '#181616',
    surface2: '#201D1D',
    surface3: '#292525',
    surface4: '#332E2E',
    scrim: 'rgba(8, 7, 7, .72)',
    line1: 'rgba(255, 238, 232, .06)',
    line2: 'rgba(255, 238, 232, .11)',
    lineInput: '#6E6462',
    fg1: '#F4EFEE',
    fg2: '#B8AFAD',
    fg3: '#958B89',
    ember: '#D63E31',
    emberPress: '#C23628',
    emberFg: '#FF6B57',
    emberSoft: 'rgba(255, 107, 87, .12)',
    emberLine: 'rgba(255, 107, 87, .38)',
    onEmber: '#FFFFFF',
    ok: '#5BD49A',
    okSoft: 'rgba(91, 212, 154, .12)',
    warn: '#F2B65A',
    warnSoft: 'rgba(242, 182, 90, .12)',
    danger: '#FF8FA3',
    dangerSoft: 'rgba(255, 143, 163, .12)',
    info: '#7FB2FF',
  },
  font: {
    sans: '"Geist Variable", "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    mono: '"Geist Mono Variable", "Geist Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  },
  radius: { xs: 4, sm: 6, md: 10, lg: 14, xl: 18, xxl: 24 },
  elevation: {
    e1: 'inset 0 1px 0 rgba(255, 255, 255, .035), 0 1px 2px rgba(0, 0, 0, .35)',
    e2: '0 12px 32px -12px rgba(0, 0, 0, .7), 0 0 0 1px rgba(255, 238, 232, .11)',
    e3: '0 32px 80px -16px rgba(0, 0, 0, .8), 0 0 0 1px rgba(255, 238, 232, .11)',
  },
  motion: {
    press: '90ms',
    fast: '160ms',
    base: '240ms',
    slow: '380ms',
    celebrate: '900ms',
    easeOut: 'cubic-bezier(.22, 1, .36, 1)',
    easeInOut: 'cubic-bezier(.65, 0, .35, 1)',
    spring: 'cubic-bezier(.34, 1.56, .64, 1)',
  },
} as const;
