/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_STATUS, ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import type { CellValueElementProps } from '@kbn/timelines-plugin/common';
import { createObservabilityRuleTypeRegistryMock } from '../../rules/observability_rule_type_registry_mock';
import { render } from '../../utils/test_helper';
import { getRenderCellValue } from './render_cell_value';

interface AlertsTableRow {
  alertStatus: typeof ALERT_STATUS_ACTIVE | typeof ALERT_STATUS_RECOVERED;
}

describe('getRenderCellValue', () => {
  const observabilityRuleTypeRegistryMock = createObservabilityRuleTypeRegistryMock();

  const renderCellValue = getRenderCellValue({
    setFlyoutAlert: jest.fn(),
    observabilityRuleTypeRegistry: observabilityRuleTypeRegistryMock,
  });

  describe('when column is alert status', () => {
    it('should return an active indicator when alert status is active', async () => {
      const cell = render(
        renderCellValue({
          ...requiredProperties,
          columnId: ALERT_STATUS,
          data: makeAlertsTableRow({ alertStatus: ALERT_STATUS_ACTIVE }),
        })
      );

      expect(cell.getByText('Active')).toBeInTheDocument();
    });

    it('should return a recovered indicator when alert status is recovered', async () => {
      const cell = render(
        renderCellValue({
          ...requiredProperties,
          columnId: ALERT_STATUS,
          data: makeAlertsTableRow({ alertStatus: ALERT_STATUS_RECOVERED }),
        })
      );

      expect(cell.getByText('Recovered')).toBeInTheDocument();
    });
  });
});

function makeAlertsTableRow({ alertStatus }: AlertsTableRow) {
  return [
    {
      field: ALERT_STATUS,
      value: [alertStatus],
    },
  ];
}

const requiredProperties: CellValueElementProps = {
  rowIndex: 0,
  colIndex: 0,
  columnId: '',
  setCellProps: jest.fn(),
  isExpandable: false,
  isExpanded: false,
  isDetails: false,
  data: [],
  eventId: '',
  header: {
    id: '',
    columnHeaderType: 'not-filtered',
  },
  isDraggable: false,
  linkValues: [],
  scopeId: '',
};
