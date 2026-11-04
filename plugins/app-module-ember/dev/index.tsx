import { createDevApp } from '@backstage/frontend-dev-utils';
import searchPlugin from '@backstage/plugin-search/alpha';
import emberAppModule from '../src';
import { devFetchModule, devPagePlugins } from './devFeatures';

createDevApp({ features: [emberAppModule, devFetchModule, searchPlugin, ...devPagePlugins] });
