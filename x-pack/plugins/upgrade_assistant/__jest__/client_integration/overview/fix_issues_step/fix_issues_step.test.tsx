/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';
import { deprecationsServiceMock } from 'src/core/public/mocks';

import { setupEnvironment, kibanaDeprecationsServiceHelpers } from '../../helpers';
import { OverviewTestBed, setupOverviewPage } from '../overview.helpers';
import { esDeprecations, esDeprecationsEmpty } from './mocked_responses';

describe('Overview - Fix deprecation issues step', () => {
  let testBed: OverviewTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  const {
    mockedCriticalKibanaDeprecations,
    mockedWarningKibanaDeprecations,
  } = kibanaDeprecationsServiceHelpers.defaultMockedResponses;

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esDeprecations);

    await act(async () => {
      const deprecationService = deprecationsServiceMock.createStartContract();
      kibanaDeprecationsServiceHelpers.setLoadDeprecations({ deprecationService });

      testBed = await setupOverviewPage({
        services: {
          core: {
            deprecations: deprecationService,
          },
        },
      });
    });

    const { component } = testBed;
    component.update();
  });

  afterAll(() => {
    server.restore();
  });

  describe('Step status', () => {
    test(`It's complete when there are no critical deprecations`, async () => {
      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esDeprecationsEmpty);

      await act(async () => {
        const deprecationService = deprecationsServiceMock.createStartContract();
        deprecationService.getAllDeprecations = jest.fn().mockRejectedValue([]);

        testBed = await setupOverviewPage({
          services: {
            core: {
              deprecations: deprecationService,
            },
          },
        });
      });

      const { exists, component } = testBed;

      component.update();

      expect(exists(`fixIssuesStep-complete`)).toBe(true);
    });

    test(`It's incomplete when there are critical deprecations`, async () => {
      const { exists } = testBed;

      expect(exists(`fixIssuesStep-incomplete`)).toBe(true);
    });
  });

  describe('ES deprecations', () => {
    test('Shows deprecation warning and critical counts', () => {
      const { exists, find } = testBed;

      expect(exists('esStatsPanel')).toBe(true);
      expect(find('esStatsPanel.warningDeprecations').text()).toContain('1');
      expect(find('esStatsPanel.criticalDeprecations').text()).toContain('1');
    });

    test(`Hides deprecation counts if it doesn't have any`, async () => {
      httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esDeprecationsEmpty);

      await act(async () => {
        testBed = await setupOverviewPage();
      });

      const { exists } = testBed;

      expect(exists('noDeprecationsLabel')).toBe(true);
    });

    test('Stats panel contains link to ES deprecations page', () => {
      const { component, exists, find } = testBed;

      component.update();

      expect(exists('esStatsPanel')).toBe(true);
      expect(find('esStatsPanel').find('a').props().href).toBe('/es_deprecations');
    });

    describe('Renders errors', () => {
      test('handles network failure', async () => {
        const error = {
          statusCode: 500,
          error: 'Internal server error',
          message: 'Internal server error',
        };

        httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

        await act(async () => {
          testBed = await setupOverviewPage();
        });

        const { component, exists } = testBed;

        component.update();

        expect(exists('esRequestErrorIconTip')).toBe(true);
      });

      test('handles unauthorized error', async () => {
        const error = {
          statusCode: 403,
          error: 'Forbidden',
          message: 'Forbidden',
        };

        httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

        await act(async () => {
          testBed = await setupOverviewPage();
        });

        const { component, exists } = testBed;

        component.update();

        expect(exists('unauthorizedErrorIconTip')).toBe(true);
      });

      test('handles partially upgraded error', async () => {
        const error = {
          statusCode: 426,
          error: 'Upgrade required',
          message: 'There are some nodes running a different version of Elasticsearch',
          attributes: {
            allNodesUpgraded: false,
          },
        };

        httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

        await act(async () => {
          testBed = await setupOverviewPage({ isReadOnlyMode: false });
        });

        const { component, exists } = testBed;

        component.update();

        expect(exists('partiallyUpgradedErrorIconTip')).toBe(true);
      });

      test('handles upgrade error', async () => {
        const error = {
          statusCode: 426,
          error: 'Upgrade required',
          message: 'There are some nodes running a different version of Elasticsearch',
          attributes: {
            allNodesUpgraded: true,
          },
        };

        httpRequestsMockHelpers.setLoadEsDeprecationsResponse(undefined, error);

        await act(async () => {
          testBed = await setupOverviewPage({ isReadOnlyMode: false });
        });

        const { component, exists } = testBed;

        component.update();

        expect(exists('upgradedErrorIconTip')).toBe(true);
      });
    });
  });

  describe('Kibana deprecations', () => {
    test('Shows deprecation warning and critical counts', () => {
      const { exists, find } = testBed;

      expect(exists('kibanaStatsPanel')).toBe(true);
      expect(find('kibanaStatsPanel.warningDeprecations').text()).toContain(
        mockedWarningKibanaDeprecations.length
      );
      expect(find('kibanaStatsPanel.criticalDeprecations').text()).toContain(
        mockedCriticalKibanaDeprecations.length
      );
    });

    test(`Hides deprecation count if it doesn't have any`, async () => {
      await act(async () => {
        const deprecationService = deprecationsServiceMock.createStartContract();
        kibanaDeprecationsServiceHelpers.setLoadDeprecations({ deprecationService, response: [] });

        testBed = await setupOverviewPage({
          services: {
            core: {
              deprecations: deprecationService,
            },
          },
        });
      });

      const { exists, component } = testBed;

      component.update();

      expect(exists('noDeprecationsLabel')).toBe(true);
      expect(exists('kibanaStatsPanel.warningDeprecations')).toBe(false);
      expect(exists('kibanaStatsPanel.criticalDeprecations')).toBe(false);
    });

    test('Stats panel contains link to Kibana deprecations page', () => {
      const { component, exists, find } = testBed;

      component.update();

      expect(exists('kibanaStatsPanel')).toBe(true);
      expect(find('kibanaStatsPanel').find('a').props().href).toBe('/kibana_deprecations');
    });

    describe('Renders errors', () => {
      test('Handles network failure', async () => {
        await act(async () => {
          const deprecationService = deprecationsServiceMock.createStartContract();
          kibanaDeprecationsServiceHelpers.setLoadDeprecations({
            deprecationService,
            mockRequestErrorMessage: 'Internal Server Error',
          });

          testBed = await setupOverviewPage({
            services: {
              core: {
                deprecations: deprecationService,
              },
            },
          });
        });

        const { component, exists } = testBed;

        component.update();

        expect(exists('kibanaRequestErrorIconTip')).toBe(true);
      });
    });
  });
});
