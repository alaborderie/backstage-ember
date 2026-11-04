import { createDevApp } from '@backstage/frontend-dev-utils';
import emberAppModule from '../src';
import { devFetchModule, devPagePlugins } from './devFeatures';

createDevApp({ features: [emberAppModule, devFetchModule, ...devPagePlugins] });
