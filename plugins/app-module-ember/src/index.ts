/**
 * The Ember theme and shell navigation for the Backstage new frontend system.
 *
 * @packageDocumentation
 */
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { NavContentBlueprint } from '@backstage/plugin-app-react';
import { emberThemeExtension } from './theme/EmberTheme';
import { EmberNav } from './nav/EmberNav';

const emberNavContent = NavContentBlueprint.make({
  name: 'ember',
  params: { component: EmberNav },
});

/**
 * Installs the Ember theme (`theme:app/ember`) and the Ember navigation
 * (`nav-content:app/ember`) into the app plugin.
 *
 * @public
 */
const emberAppModule = createFrontendModule({
  pluginId: 'app',
  extensions: [emberThemeExtension, emberNavContent],
});

export default emberAppModule;
export { emberAppModule };
export { emberTokens } from './theme/tokens';
export { EMBER_THEME_ID } from './theme/EmberTheme';
