/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionList, expectedExportedExceptionList } from '../../../objects/exception';
import { getNewRule } from '../../../objects/rule';

import { createRule } from '../../../tasks/api_calls/rules';
import { login, visitWithoutDateRange, waitForPageWithoutDateRange } from '../../../tasks/login';

import { EXCEPTIONS_URL } from '../../../urls/navigation';
import {
  assertExceptionListsExists,
  duplicateSharedExceptionListFromListsManagementPageByListId,
  findSharedExceptionListItemsByName,
  deleteExceptionListWithoutRuleReferenceByListId,
  deleteExceptionListWithRuleReferenceByListId,
  exportExceptionList,
  waitForExceptionsTableToBeLoaded,
  createSharedExceptionList,
  linkRulesToExceptionList,
  assertNumberLinkedRules,
} from '../../../tasks/exceptions_table';
import {
  EXCEPTIONS_LIST_MANAGEMENT_NAME,
  EXCEPTIONS_TABLE_SHOWING_LISTS,
} from '../../../screens/exceptions';
import { createExceptionList, createExceptionListItem } from '../../../tasks/api_calls/exceptions';
import { esArchiverResetKibana } from '../../../tasks/es_archiver';
import { assertNumberOfExceptionItemsExists } from '../../../tasks/exceptions';

import { TOASTER } from '../../../screens/alerts_detection_rules';

const EXCEPTION_LIST_NAME = 'My shared list';
const EXCEPTION_LIST_TO_DUPLICATE_NAME = 'A test list 2';
const EXCEPTION_LIST_ITEM_NAME = 'Sample Exception List Item 1';
const EXCEPTION_LIST_ITEM_NAME_2 = 'Sample Exception List Item 2';

const getExceptionList1 = () => ({
  ...getExceptionList(),
  name: EXCEPTION_LIST_NAME,
  list_id: 'exception_list_1',
});

const getExceptionList2 = () => ({
  ...getExceptionList(),
  name: EXCEPTION_LIST_TO_DUPLICATE_NAME,
  list_id: 'exception_list_2',
});

const expiredDate = new Date(Date.now() - 1000000).toISOString();
const futureDate = new Date(Date.now() + 1000000).toISOString();

describe('Manage shared exception list', () => {
  describe('Create/Export/Delete', () => {
    before(() => {
      esArchiverResetKibana();
      login();

      createRule(getNewRule({ name: 'Another rule' }));

      // Create exception list associated with a rule
      createExceptionList(getExceptionList2(), getExceptionList2().list_id).then((response) =>
        createRule(
          getNewRule({
            exceptions_list: [
              {
                id: response.body.id,
                list_id: getExceptionList2().list_id,
                type: getExceptionList2().type,
                namespace_type: getExceptionList2().namespace_type,
              },
            ],
          })
        )
      );

      // Create exception list not used by any rules
      createExceptionList(getExceptionList1(), getExceptionList1().list_id).as(
        'exceptionListResponse'
      );
    });

    beforeEach(() => {
      login();
      visitWithoutDateRange(EXCEPTIONS_URL);
      waitForExceptionsTableToBeLoaded();
    });

    it('Export exception list', function () {
      cy.intercept(/(\/api\/exception_lists\/_export)/).as('export');

      exportExceptionList(getExceptionList1().list_id);

      cy.wait('@export').then(({ response }) => {
        cy.wrap(response?.body).should(
          'eql',
          expectedExportedExceptionList(this.exceptionListResponse)
        );

        cy.get(TOASTER).should(
          'have.text',
          `Exception list "${EXCEPTION_LIST_NAME}" exported successfully`
        );
      });
    });

    it('Link rules to shared exception list', function () {
      assertNumberLinkedRules(getExceptionList2().list_id, '1');
      linkRulesToExceptionList(getExceptionList2().list_id, 1);
      assertNumberLinkedRules(getExceptionList2().list_id, '2');
    });

    it('Create exception list', function () {
      createSharedExceptionList(
        { name: 'Newly created list', description: 'This is my list.' },
        true
      );

      // After creation - directed to list detail page
      cy.get(EXCEPTIONS_LIST_MANAGEMENT_NAME).should('have.text', 'Newly created list');
    });

    it('Delete exception list without rule reference', () => {
      // Using cy.contains because we do not care about the exact text,
      // just checking number of lists shown
      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '4');

      deleteExceptionListWithoutRuleReferenceByListId(getExceptionList1().list_id);

      // Using cy.contains because we do not care about the exact text,
      // just checking number of lists shown
      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '3');
    });

    it('Deletes exception list with rule reference', () => {
      waitForPageWithoutDateRange(EXCEPTIONS_URL);
      waitForExceptionsTableToBeLoaded();

      // Using cy.contains because we do not care about the exact text,
      // just checking number of lists shown
      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '3');

      deleteExceptionListWithRuleReferenceByListId(getExceptionList2().list_id);

      // Using cy.contains because we do not care about the exact text,
      // just checking number of lists shown
      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '2');
    });
  });

  describe('Duplicate', () => {
    beforeEach(() => {
      esArchiverResetKibana();
      login();

      // Create exception list associated with a rule
      createExceptionList(getExceptionList2(), getExceptionList2().list_id);

      createExceptionListItem(getExceptionList2().list_id, {
        list_id: getExceptionList2().list_id,
        item_id: 'simple_list_item_1',
        tags: [],
        type: 'simple',
        description: 'Test exception item',
        name: EXCEPTION_LIST_ITEM_NAME,
        namespace_type: 'single',
        entries: [
          {
            field: 'host.name',
            operator: 'included',
            type: 'match_any',
            value: ['some host', 'another host'],
          },
        ],
        expire_time: expiredDate,
      });
      createExceptionListItem(getExceptionList2().list_id, {
        list_id: getExceptionList2().list_id,
        item_id: 'simple_list_item_2',
        tags: [],
        type: 'simple',
        description: 'Test exception item',
        name: EXCEPTION_LIST_ITEM_NAME_2,
        namespace_type: 'single',
        entries: [
          {
            field: 'host.name',
            operator: 'included',
            type: 'match_any',
            value: ['some host', 'another host'],
          },
        ],
        expire_time: futureDate,
      });

      visitWithoutDateRange(EXCEPTIONS_URL);
      waitForExceptionsTableToBeLoaded();
    });

    it('Duplicate exception list with expired items', function () {
      duplicateSharedExceptionListFromListsManagementPageByListId(
        getExceptionList2().list_id,
        true
      );

      // After duplication - check for new list
      assertExceptionListsExists([`${EXCEPTION_LIST_TO_DUPLICATE_NAME} [Duplicate]`]);

      findSharedExceptionListItemsByName(`${EXCEPTION_LIST_TO_DUPLICATE_NAME} [Duplicate]`, [
        EXCEPTION_LIST_ITEM_NAME,
        EXCEPTION_LIST_ITEM_NAME_2,
      ]);

      assertNumberOfExceptionItemsExists(2);
    });

    it('Duplicate exception list without expired items', function () {
      duplicateSharedExceptionListFromListsManagementPageByListId(
        getExceptionList2().list_id,
        false
      );

      // After duplication - check for new list
      assertExceptionListsExists([`${EXCEPTION_LIST_TO_DUPLICATE_NAME} [Duplicate]`]);

      findSharedExceptionListItemsByName(`${EXCEPTION_LIST_TO_DUPLICATE_NAME} [Duplicate]`, [
        EXCEPTION_LIST_ITEM_NAME_2,
      ]);

      assertNumberOfExceptionItemsExists(1);
    });
  });
});
