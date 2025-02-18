/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  PluginInitializerContext,
  CoreStart,
  CoreSetup,
  Plugin as PluginType,
  Logger,
  SavedObjectsClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import { Dataset } from '@kbn/rule-registry-plugin/server';
import { SyntheticsMonitorClient } from './synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { initSyntheticsServer } from './server';
import { initUptimeServer } from './legacy_uptime/uptime_server';
import { uptimeFeature } from './feature';
import {
  UptimeCorePluginsSetup,
  UptimeCorePluginsStart,
  UptimeServerSetup,
} from './legacy_uptime/lib/adapters';
import { TelemetryEventsSender } from './legacy_uptime/lib/telemetry/sender';
import {
  registerUptimeSavedObjects,
  savedObjectsAdapter,
} from './legacy_uptime/lib/saved_objects/saved_objects';
import { UptimeConfig } from '../common/config';
import { SyntheticsService } from './synthetics_service/synthetics_service';
import { syntheticsServiceApiKey } from './legacy_uptime/lib/saved_objects/service_api_key';
import { SYNTHETICS_RULE_TYPES_ALERT_CONTEXT } from '../common/constants/synthetics_alerts';
import { uptimeRuleTypeFieldMap } from './legacy_uptime/lib/alerts/common';

export type UptimeRuleRegistry = ReturnType<Plugin['setup']>['ruleRegistry'];

export class Plugin implements PluginType {
  private savedObjectsClient?: SavedObjectsClientContract;
  private initContext: PluginInitializerContext;
  private logger: Logger;
  private server?: UptimeServerSetup;
  private syntheticsService?: SyntheticsService;
  private syntheticsMonitorClient?: SyntheticsMonitorClient;
  private readonly telemetryEventsSender: TelemetryEventsSender;

  constructor(initializerContext: PluginInitializerContext<UptimeConfig>) {
    this.initContext = initializerContext;
    this.logger = initializerContext.logger.get();
    this.telemetryEventsSender = new TelemetryEventsSender(this.logger);
  }

  public setup(core: CoreSetup, plugins: UptimeCorePluginsSetup) {
    const config = this.initContext.config.get<UptimeConfig>();

    savedObjectsAdapter.config = config;

    this.logger = this.initContext.logger.get();
    const { ruleDataService } = plugins.ruleRegistry;

    const ruleDataClient = ruleDataService.initializeIndex({
      feature: 'uptime',
      registrationContext: SYNTHETICS_RULE_TYPES_ALERT_CONTEXT,
      dataset: Dataset.alerts,
      componentTemplateRefs: [],
      componentTemplates: [
        {
          name: 'mappings',
          mappings: mappingFromFieldMap(uptimeRuleTypeFieldMap, 'strict'),
        },
      ],
    });

    this.server = {
      config,
      router: core.http.createRouter(),
      cloud: plugins.cloud,
      stackVersion: this.initContext.env.packageInfo.version,
      basePath: core.http.basePath,
      logger: this.logger,
      telemetry: this.telemetryEventsSender,
      isDev: this.initContext.env.mode.dev,
    } as UptimeServerSetup;

    this.syntheticsService = new SyntheticsService(this.server);

    this.syntheticsService.setup(plugins.taskManager);

    this.syntheticsMonitorClient = new SyntheticsMonitorClient(this.syntheticsService, this.server);

    this.telemetryEventsSender.setup(plugins.telemetry);

    plugins.features.registerKibanaFeature(uptimeFeature);

    initUptimeServer(this.server, plugins, ruleDataClient, this.logger);

    initSyntheticsServer(this.server, this.syntheticsMonitorClient, plugins, ruleDataClient);

    registerUptimeSavedObjects(core.savedObjects, plugins.encryptedSavedObjects);

    return {
      ruleRegistry: ruleDataClient,
    };
  }

  public start(coreStart: CoreStart, pluginsStart: UptimeCorePluginsStart) {
    this.savedObjectsClient = new SavedObjectsClient(
      coreStart.savedObjects.createInternalRepository([syntheticsServiceApiKey.name])
    );

    if (this.server) {
      this.server.coreStart = coreStart;
      this.server.security = pluginsStart.security;
      this.server.fleet = pluginsStart.fleet;
      this.server.encryptedSavedObjects = pluginsStart.encryptedSavedObjects;
      this.server.savedObjectsClient = this.savedObjectsClient;
      this.server.spaces = pluginsStart.spaces;
    }

    this.syntheticsService?.start(pluginsStart.taskManager);

    this.telemetryEventsSender.start(pluginsStart.telemetry, coreStart);
  }

  public stop() {}
}
