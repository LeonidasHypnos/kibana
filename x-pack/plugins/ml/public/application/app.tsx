/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import './_index.scss';
import ReactDOM from 'react-dom';
import { pick } from 'lodash';

import { AppMountParameters, CoreStart, HttpStart } from '@kbn/core/public';

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { DatePickerContextProvider } from '@kbn/ml-date-picker';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { toMountPoint, wrapWithTheme } from '@kbn/kibana-react-plugin/public';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { StorageContextProvider } from '@kbn/ml-local-storage';

import { firstValueFrom } from 'rxjs';
import { mlCapabilities } from './capabilities/check_capabilities';
import { ML_STORAGE_KEYS } from '../../common/types/storage';
import { ML_APP_LOCATOR, ML_PAGES } from '../../common/constants/locator';
import type { MlSetupDependencies, MlStartDependencies } from '../plugin';

import { setDependencyCache, clearCache } from './util/dependency_cache';
import { setLicenseCache } from './license';
import { mlUsageCollectionProvider } from './services/usage_collection';
import { MlRouter } from './routing';
import { mlApiServicesProvider } from './services/ml_api_service';
import { HttpService } from './services/http_service';

export type MlDependencies = Omit<
  MlSetupDependencies,
  'share' | 'fieldFormats' | 'maps' | 'cases' | 'licensing'
> &
  MlStartDependencies;

interface AppProps {
  coreStart: CoreStart;
  deps: MlDependencies;
  appMountParams: AppMountParameters;
}

const localStorage = new Storage(window.localStorage);

// temporary function to hardcode the serverless state
// this will be replaced by the true serverless information from kibana
export function isServerless() {
  return false;
}

/**
 * Provides global services available across the entire ML app.
 */
export function getMlGlobalServices(httpStart: HttpStart, usageCollection?: UsageCollectionSetup) {
  const httpService = new HttpService(httpStart);
  return {
    httpService,
    mlApiServices: mlApiServicesProvider(httpService),
    mlUsageCollection: mlUsageCollectionProvider(usageCollection),
    isServerless,
    mlCapabilities,
  };
}

export interface MlServicesContext {
  mlServices: MlGlobalServices;
}

export type MlGlobalServices = ReturnType<typeof getMlGlobalServices>;

const App: FC<AppProps> = ({ coreStart, deps, appMountParams }) => {
  const redirectToMlAccessDeniedPage = async () => {
    // access maybe be denied due to an expired license, so check the license status first
    // if the license has expired, redirect to the license management page
    const license = await firstValueFrom(deps.licensing.license$);
    const redirectPage =
      license.status === 'expired'
        ? deps.share.url.locators.get('LICENSE_MANAGEMENT_LOCATOR')!.getUrl({
            page: 'dashboard',
          })
        : deps.share.url.locators.get(ML_APP_LOCATOR)!.getUrl({
            page: ML_PAGES.ACCESS_DENIED,
          });

    await coreStart.application.navigateToUrl(await redirectPage);
  };

  const pageDeps = {
    history: appMountParams.history,
    setHeaderActionMenu: appMountParams.setHeaderActionMenu,
    dataViewsContract: deps.data.dataViews,
    config: coreStart.uiSettings!,
    setBreadcrumbs: coreStart.chrome!.setBreadcrumbs,
    redirectToMlAccessDeniedPage,
  };

  const services = {
    kibanaVersion: deps.kibanaVersion,
    share: deps.share,
    data: deps.data,
    security: deps.security,
    licenseManagement: deps.licenseManagement,
    storage: localStorage,
    embeddable: deps.embeddable,
    maps: deps.maps,
    triggersActionsUi: deps.triggersActionsUi,
    dataVisualizer: deps.dataVisualizer,
    usageCollection: deps.usageCollection,
    fieldFormats: deps.fieldFormats,
    dashboard: deps.dashboard,
    charts: deps.charts,
    cases: deps.cases,
    unifiedSearch: deps.unifiedSearch,
    licensing: deps.licensing,
    lens: deps.lens,
    savedObjectsManagement: deps.savedObjectsManagement,
    savedSearch: deps.savedSearch,
    ...coreStart,
  };

  const datePickerDeps = {
    ...pick(services, ['data', 'http', 'notifications', 'theme', 'uiSettings']),
    toMountPoint,
    wrapWithTheme,
    uiSettingsKeys: UI_SETTINGS,
  };

  const I18nContext = coreStart.i18n.Context;
  const ApplicationUsageTrackingProvider =
    deps.usageCollection?.components.ApplicationUsageTrackingProvider ?? React.Fragment;

  return (
    <ApplicationUsageTrackingProvider>
      <I18nContext>
        <KibanaThemeProvider theme$={appMountParams.theme$}>
          <KibanaContextProvider
            services={{
              ...services,
              mlServices: getMlGlobalServices(coreStart.http, deps.usageCollection),
            }}
          >
            <StorageContextProvider storage={localStorage} storageKeys={ML_STORAGE_KEYS}>
              <DatePickerContextProvider {...datePickerDeps}>
                <MlRouter pageDeps={pageDeps} />
              </DatePickerContextProvider>
            </StorageContextProvider>
          </KibanaContextProvider>
        </KibanaThemeProvider>
      </I18nContext>
    </ApplicationUsageTrackingProvider>
  );
};

export const renderApp = (
  coreStart: CoreStart,
  deps: MlDependencies,
  appMountParams: AppMountParameters
) => {
  setDependencyCache({
    timefilter: deps.data.query.timefilter,
    fieldFormats: deps.fieldFormats,
    autocomplete: deps.unifiedSearch.autocomplete,
    config: coreStart.uiSettings!,
    chrome: coreStart.chrome!,
    docLinks: coreStart.docLinks!,
    toastNotifications: coreStart.notifications.toasts,
    overlays: coreStart.overlays,
    theme: coreStart.theme,
    recentlyAccessed: coreStart.chrome!.recentlyAccessed,
    basePath: coreStart.http.basePath,
    savedObjectsClient: coreStart.savedObjects.client,
    savedSearch: deps.savedSearch,
    application: coreStart.application,
    http: coreStart.http,
    security: deps.security,
    dashboard: deps.dashboard,
    maps: deps.maps,
    dataVisualizer: deps.dataVisualizer,
    dataViews: deps.data.dataViews,
    share: deps.share,
    lens: deps.lens,
  });

  appMountParams.onAppLeave((actions) => actions.default());

  const mlLicense = setLicenseCache(deps.licensing, coreStart.application, () =>
    ReactDOM.render(
      <App coreStart={coreStart} deps={deps} appMountParams={appMountParams} />,
      appMountParams.element
    )
  );

  return () => {
    mlLicense.unsubscribe();
    clearCache();
    ReactDOM.unmountComponentAtNode(appMountParams.element);
    deps.data.search.session.clear();
  };
};
