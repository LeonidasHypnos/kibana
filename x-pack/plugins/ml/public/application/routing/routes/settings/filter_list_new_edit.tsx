/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import { useTimefilter } from '@kbn/ml-date-picker';

import { ML_PAGES } from '../../../../../common/constants/locator';

import { checkFullLicense } from '../../../license';
import {
  checkGetJobsCapabilitiesResolver,
  checkPermission,
} from '../../../capabilities/check_capabilities';
import { getMlNodeCount } from '../../../ml_nodes_check/check_ml_nodes';
import { EditFilterList } from '../../../settings/filter_lists';
import { NavigateToPath } from '../../../contexts/kibana';

import { createPath, MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

enum MODE {
  NEW,
  EDIT,
}

interface NewFilterPageProps extends PageProps {
  mode: MODE;
}

export const newFilterListRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: createPath(ML_PAGES.FILTER_LISTS_NEW),
  title: i18n.translate('xpack.ml.settings.createFilter.docTitle', {
    defaultMessage: 'Create Filter',
  }),
  render: (props, deps) => <PageWrapper {...props} mode={MODE.NEW} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('ANOMALY_DETECTION_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('SETTINGS_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('FILTER_LISTS_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.settings.breadcrumbs.filterLists.createLabel', {
        defaultMessage: 'Create',
      }),
    },
  ],
});

export const editFilterListRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: createPath(ML_PAGES.FILTER_LISTS_EDIT, '/:filterId'),
  title: i18n.translate('xpack.ml.settings.editFilter.docTitle', {
    defaultMessage: 'Edit Filter',
  }),
  render: (props, deps) => <PageWrapper {...props} mode={MODE.EDIT} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('SETTINGS_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('FILTER_LISTS_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.settings.breadcrumbs.filterLists.editLabel', {
        defaultMessage: 'Edit',
      }),
    },
  ],
});

const PageWrapper: FC<NewFilterPageProps> = ({ location, mode, deps }) => {
  let filterId: string | undefined;
  if (mode === MODE.EDIT) {
    const pathMatch: string[] | null = location.pathname.match(/.+\/(.+)$/);
    filterId = pathMatch && pathMatch.length > 1 ? pathMatch[1] : undefined;
  }
  const { redirectToMlAccessDeniedPage } = deps;

  const { context } = useResolver(undefined, undefined, deps.config, deps.dataViewsContract, {
    checkFullLicense,
    checkGetJobsCapabilities: () => checkGetJobsCapabilitiesResolver(redirectToMlAccessDeniedPage),
    getMlNodeCount,
  });

  useTimefilter({ timeRangeSelector: false, autoRefreshSelector: false });

  const canCreateFilter = checkPermission('canCreateFilter');
  const canDeleteFilter = checkPermission('canDeleteFilter');

  return (
    <PageLoader context={context}>
      <EditFilterList
        {...{
          filterId,
          canCreateFilter,
          canDeleteFilter,
        }}
      />
    </PageLoader>
  );
};
