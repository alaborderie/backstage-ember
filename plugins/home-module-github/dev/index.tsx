import { createDevApp } from '@backstage/frontend-dev-utils';
import homePlugin from '@backstage/plugin-home/alpha';
import searchPlugin from '@backstage/plugin-search/alpha';
import emberAppModule from '@alaborderie/backstage-plugin-app-module-ember';
import homeModuleGithub from '../src';
import { devAppModule, devPagePlugins } from './devFeatures';
import { installGithubMock } from './mockGithub';

installGithubMock();

createDevApp({
  features: [homePlugin, homeModuleGithub, emberAppModule, devAppModule, searchPlugin, ...devPagePlugins],
});
