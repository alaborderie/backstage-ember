import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { buiVariables, emberStylesheet, emberVariables } from './cssVariables';
import { emberTokens } from './tokens';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('Ember stylesheet', () => {
  it('only sets variables that @backstage/ui defines', () => {
    const bui = readFileSync(
      join(dirname(require.resolve('@backstage/ui')), 'css', 'styles.css'),
      'utf8',
    );
    const missing = Object.keys(buiVariables).filter(
      name => !bui.includes(`${name}:`),
    );
    expect(missing).toEqual([]);
  });

  it('applies only while the Ember theme is active', () => {
    const css = emberStylesheet('ember');
    expect(css).toContain("body[data-theme-name='ember'] {");
    expect(css).toContain('--bui-bg-app: #0F0E0E;');
    expect(css).toContain('--ember-fg-tertiary: #958B89;');
    expect(css).not.toMatch(/^:root/m);
    expect(
      Object.keys(emberVariables).every(name => name.startsWith('--ember-')),
    ).toBe(true);
  });
});

describe('Ember contrast', () => {
  const c = emberTokens.color;
  it.each([
    ['fg1 on canvas', c.fg1, c.canvas],
    ['fg2 on surface1', c.fg2, c.surface1],
    ['fg3 on surface1', c.fg3, c.surface1],
    ['fg3 on surface3', c.fg3, c.surface3],
    ['white on ember', c.onEmber, c.ember],
    ['ember text on canvas', c.emberFg, c.canvas],
    ['ok on surface1', c.ok, c.surface1],
    ['danger on surface1', c.danger, c.surface1],
  ])('%s passes WCAG AA for text', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps input boundaries at 3:1 against the canvas', () => {
    expect(contrast(c.lineInput, c.canvas)).toBeGreaterThanOrEqual(3);
  });
});
