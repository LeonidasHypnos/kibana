/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import type { ActionType } from '@kbn/actions-plugin/common';
import type { ActionResult } from '@kbn/actions-plugin/server/types';
import { JiraFieldsRT } from './jira';
import { ResilientFieldsRT } from './resilient';
import { ServiceNowITSMFieldsRT } from './servicenow_itsm';
import { ServiceNowSIRFieldsRT } from './servicenow_sir';
import { SwimlaneFieldsRT } from './swimlane';

export type ActionConnector = ActionResult;
export type ActionTypeConnector = ActionType;

export enum ConnectorTypes {
  casesWebhook = '.cases-webhook',
  jira = '.jira',
  none = '.none',
  resilient = '.resilient',
  serviceNowITSM = '.servicenow',
  serviceNowSIR = '.servicenow-sir',
  swimlane = '.swimlane',
}

const ConnectorCasesWebhookTypeFieldsRt = rt.strict({
  type: rt.literal(ConnectorTypes.casesWebhook),
  fields: rt.null,
});

const ConnectorJiraTypeFieldsRt = rt.strict({
  type: rt.literal(ConnectorTypes.jira),
  fields: rt.union([JiraFieldsRT, rt.null]),
});

const ConnectorResilientTypeFieldsRt = rt.strict({
  type: rt.literal(ConnectorTypes.resilient),
  fields: rt.union([ResilientFieldsRT, rt.null]),
});

const ConnectorServiceNowITSMTypeFieldsRt = rt.strict({
  type: rt.literal(ConnectorTypes.serviceNowITSM),
  fields: rt.union([ServiceNowITSMFieldsRT, rt.null]),
});

const ConnectorSwimlaneTypeFieldsRt = rt.strict({
  type: rt.literal(ConnectorTypes.swimlane),
  fields: rt.union([SwimlaneFieldsRT, rt.null]),
});

const ConnectorServiceNowSIRTypeFieldsRt = rt.strict({
  type: rt.literal(ConnectorTypes.serviceNowSIR),
  fields: rt.union([ServiceNowSIRFieldsRT, rt.null]),
});

const ConnectorNoneTypeFieldsRt = rt.strict({
  type: rt.literal(ConnectorTypes.none),
  fields: rt.null,
});

export const NONE_CONNECTOR_ID: string = 'none';

export const ConnectorTypeFieldsRt = rt.union([
  ConnectorCasesWebhookTypeFieldsRt,
  ConnectorJiraTypeFieldsRt,
  ConnectorNoneTypeFieldsRt,
  ConnectorResilientTypeFieldsRt,
  ConnectorServiceNowITSMTypeFieldsRt,
  ConnectorServiceNowSIRTypeFieldsRt,
  ConnectorSwimlaneTypeFieldsRt,
]);

/**
 * This type represents the connector's format when it is encoded within a user action.
 */
export const CaseUserActionConnectorRt = rt.union([
  rt.intersection([ConnectorCasesWebhookTypeFieldsRt, rt.strict({ name: rt.string })]),
  rt.intersection([ConnectorJiraTypeFieldsRt, rt.strict({ name: rt.string })]),
  rt.intersection([ConnectorNoneTypeFieldsRt, rt.strict({ name: rt.string })]),
  rt.intersection([ConnectorResilientTypeFieldsRt, rt.strict({ name: rt.string })]),
  rt.intersection([ConnectorServiceNowITSMTypeFieldsRt, rt.strict({ name: rt.string })]),
  rt.intersection([ConnectorServiceNowSIRTypeFieldsRt, rt.strict({ name: rt.string })]),
  rt.intersection([ConnectorSwimlaneTypeFieldsRt, rt.strict({ name: rt.string })]),
]);

export const CaseConnectorRt = rt.intersection([
  rt.strict({
    id: rt.string,
  }),
  CaseUserActionConnectorRt,
]);

const ActionConnectorResultRt = rt.intersection([
  rt.strict({
    id: rt.string,
    actionTypeId: rt.string,
    name: rt.string,
    isDeprecated: rt.boolean,
    isPreconfigured: rt.boolean,
    referencedByCount: rt.number,
  }),
  rt.exact(rt.partial({ config: rt.record(rt.string, rt.unknown), isMissingSecrets: rt.boolean })),
]);

export const FindActionConnectorResponseRt = rt.array(ActionConnectorResultRt);

export type CaseUserActionConnector = rt.TypeOf<typeof CaseUserActionConnectorRt>;
export type CaseConnector = rt.TypeOf<typeof CaseConnectorRt>;
export type ConnectorTypeFields = rt.TypeOf<typeof ConnectorTypeFieldsRt>;
export type ConnectorCasesWebhookTypeFields = rt.TypeOf<typeof ConnectorCasesWebhookTypeFieldsRt>;
export type ConnectorJiraTypeFields = rt.TypeOf<typeof ConnectorJiraTypeFieldsRt>;
export type ConnectorResilientTypeFields = rt.TypeOf<typeof ConnectorResilientTypeFieldsRt>;
export type ConnectorSwimlaneTypeFields = rt.TypeOf<typeof ConnectorSwimlaneTypeFieldsRt>;
export type ConnectorServiceNowITSMTypeFields = rt.TypeOf<
  typeof ConnectorServiceNowITSMTypeFieldsRt
>;
export type ConnectorServiceNowSIRTypeFields = rt.TypeOf<typeof ConnectorServiceNowSIRTypeFieldsRt>;
