/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiLink, EuiText, EuiToolTip } from '@elastic/eui';
import React from 'react';
import {
  SecurityCellActions,
  CellActionsMode,
  SecurityCellActionsTrigger,
} from '../../../../common/components/cell_actions';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { HostDetailsLink } from '../../../../common/components/links';
import { FormattedRelativePreferenceDate } from '../../../../common/components/formatted_date';
import type { HostsTableColumns } from '.';
import * as i18n from './translations';
import type { Maybe, RiskSeverity } from '../../../../../common/search_strategy';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { VIEW_HOSTS_BY_SEVERITY } from '../host_risk_score_table/translations';
import { RiskScore } from '../../../components/risk_score/severity/common';
import { ENTITY_RISK_CLASSIFICATION } from '../../../components/risk_score/translations';

export const getHostsColumns = (
  showRiskColumn: boolean,
  dispatchSeverityUpdate: (s: RiskSeverity) => void
): HostsTableColumns => {
  const columns: HostsTableColumns = [
    {
      field: 'node.host.name',
      name: i18n.NAME,
      truncateText: false,
      mobileOptions: { show: true },
      sortable: true,
      render: (hostName) => {
        if (hostName != null && hostName.length > 0) {
          return (
            <SecurityCellActions
              mode={CellActionsMode.HOVER_DOWN}
              visibleCellActions={5}
              showActionTooltips
              triggerId={SecurityCellActionsTrigger.DEFAULT}
              field={{
                name: 'host.name',
                value: hostName[0],
                type: 'keyword',
                aggregatable: true,
              }}
            >
              <HostDetailsLink hostName={hostName[0]} />
            </SecurityCellActions>
          );
        }
        return getEmptyTagValue();
      },
      width: '35%',
    },
    {
      field: 'node.lastSeen',
      name: (
        <EuiToolTip content={i18n.FIRST_LAST_SEEN_TOOLTIP}>
          <>
            {i18n.LAST_SEEN} <EuiIcon color="subdued" type="iInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      truncateText: false,
      mobileOptions: { show: true },
      sortable: true,
      render: (lastSeen: Maybe<string | string[]> | undefined) => {
        if (lastSeen != null && lastSeen.length > 0) {
          return (
            <FormattedRelativePreferenceDate
              value={Array.isArray(lastSeen) ? lastSeen[0] : lastSeen}
            />
          );
        }
        return getEmptyTagValue();
      },
    },
    {
      field: 'node.host.os.name',
      name: (
        <EuiToolTip content={i18n.OS_LAST_SEEN_TOOLTIP}>
          <>
            {i18n.OS} <EuiIcon color="subdued" type="iInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      truncateText: false,
      mobileOptions: { show: true },
      sortable: false,
      render: (hostOsName) => {
        if (hostOsName != null) {
          return (
            <SecurityCellActions
              mode={CellActionsMode.HOVER_DOWN}
              visibleCellActions={5}
              showActionTooltips
              triggerId={SecurityCellActionsTrigger.DEFAULT}
              field={{
                name: 'host.os.name',
                value: hostOsName[0],
                type: 'keyword',
              }}
            >
              {hostOsName}
            </SecurityCellActions>
          );
        }
        return getEmptyTagValue();
      },
    },
    {
      field: 'node.host.os.version',
      name: i18n.VERSION,
      truncateText: false,
      mobileOptions: { show: true },
      sortable: false,
      render: (hostOsVersion) => {
        if (hostOsVersion != null) {
          return (
            <SecurityCellActions
              mode={CellActionsMode.HOVER_DOWN}
              visibleCellActions={5}
              showActionTooltips
              triggerId={SecurityCellActionsTrigger.DEFAULT}
              field={{
                name: 'host.os.version',
                value: hostOsVersion[0],
                type: 'keyword',
              }}
            >
              {hostOsVersion}
            </SecurityCellActions>
          );
        }
        return getEmptyTagValue();
      },
    },
  ];

  if (showRiskColumn) {
    columns.push({
      field: 'node.risk',
      name: (
        <EuiToolTip content={i18n.HOST_RISK_TOOLTIP}>
          <>
            {ENTITY_RISK_CLASSIFICATION(RiskScoreEntity.host)}{' '}
            <EuiIcon color="subdued" type="iInCircle" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      truncateText: false,
      mobileOptions: { show: true },
      sortable: false,
      render: (riskScore: RiskSeverity) => {
        if (riskScore != null) {
          return (
            <RiskScore
              toolTipContent={
                <EuiLink onClick={() => dispatchSeverityUpdate(riskScore)}>
                  <EuiText size="xs">{VIEW_HOSTS_BY_SEVERITY(riskScore.toLowerCase())}</EuiText>
                </EuiLink>
              }
              severity={riskScore}
            />
          );
        }
        return getEmptyTagValue();
      },
    });
  }

  return columns;
};
