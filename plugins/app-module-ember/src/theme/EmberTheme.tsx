import type { ReactNode } from 'react';
import { UnifiedThemeProvider } from '@backstage/theme';
import { ThemeBlueprint } from '@backstage/plugin-app-react';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import { createEmberMuiTheme } from './muiTheme';
import { emberStylesheet } from './cssVariables';

/** The theme ID, written by upstream to `data-theme-name` on `body`. */
export const EMBER_THEME_ID = 'ember';

const muiTheme = createEmberMuiTheme();
const stylesheet = emberStylesheet(EMBER_THEME_ID);

function EmberThemeProvider({ children }: { children: ReactNode }) {
  return (
    <UnifiedThemeProvider theme={muiTheme} themeName={EMBER_THEME_ID}>
      <style data-ember-theme="">{stylesheet}</style>
      {children}
    </UnifiedThemeProvider>
  );
}

function EmberIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
      />
    </svg>
  );
}

/** The Ember theme extension, `theme:app/ember`. */
export const emberThemeExtension = ThemeBlueprint.make({
  name: EMBER_THEME_ID,
  params: {
    theme: {
      id: EMBER_THEME_ID,
      title: 'Ember',
      variant: 'dark',
      icon: <EmberIcon />,
      Provider: EmberThemeProvider,
    },
  },
});

export { EmberIcon };
