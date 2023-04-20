'use strict';

const rbf = require( './RequestBuilderFactory' );
const { newStatementWithRandomStringValue } = require( './entityHelper' );
const { utils } = require( 'api-testing' );

module.exports.getRequests = [
	( { itemId } ) => rbf.newGetItemStatementsRequestBuilder( itemId ),
	( { itemId, statementId } ) => rbf.newGetItemStatementRequestBuilder( itemId, statementId ),
	( { itemId } ) => rbf.newGetItemRequestBuilder( itemId ),
	( { itemId } ) => rbf.newGetItemAliasesInLanguageRequestBuilder( itemId, 'en' ),
	( { itemId } ) => rbf.newGetItemAliasesRequestBuilder( itemId ),
	( { itemId } ) => rbf.newGetItemDescriptionRequestBuilder( itemId, 'en' ),
	( { itemId } ) => rbf.newGetItemDescriptionsRequestBuilder( itemId ),
	( { itemId } ) => rbf.newGetItemLabelRequestBuilder( itemId, 'en' ),
	( { itemId } ) => rbf.newGetItemLabelsRequestBuilder( itemId ),
	( { statementId } ) => rbf.newGetStatementRequestBuilder( statementId )
];

module.exports.editRequests = [
	( { itemId, stringPropertyId } ) => rbf.newAddItemStatementRequestBuilder(
		itemId,
		newStatementWithRandomStringValue( stringPropertyId )
	),
	( { itemId, statementId, stringPropertyId } ) => rbf.newReplaceItemStatementRequestBuilder(
		itemId,
		statementId,
		newStatementWithRandomStringValue( stringPropertyId )
	),
	( { statementId, stringPropertyId } ) => rbf.newReplaceStatementRequestBuilder(
		statementId,
		newStatementWithRandomStringValue( stringPropertyId )
	),
	( { itemId, statementId } ) => rbf.newRemoveItemStatementRequestBuilder( itemId, statementId ),
	( { statementId } ) => rbf.newRemoveStatementRequestBuilder( statementId ),
	( { itemId, statementId } ) => rbf.newPatchItemStatementRequestBuilder(
		itemId,
		statementId,
		[ {
			op: 'replace',
			path: '/value/content',
			value: 'random-string-value-' + utils.uniq()
		} ]
	),
	( { statementId } ) => rbf.newPatchStatementRequestBuilder(
		statementId,
		[ {
			op: 'replace',
			path: '/value/content',
			value: 'random-string-value-' + utils.uniq()
		} ]
	),
	( { itemId } ) => rbf.newSetItemLabelRequestBuilder( itemId, 'en', `english label ${utils.uniq()}` )
];
