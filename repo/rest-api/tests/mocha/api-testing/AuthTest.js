'use strict';

const { assert, action } = require( 'api-testing' );
const { RequestBuilder } = require( '../helpers/RequestBuilder' );
const {
	createItemWithStatements,
	createUniqueStringProperty,
	newStatementWithRandomStringValue,
	protectItem
} = require( '../helpers/entityHelper' );
const hasJsonDiffLib = require( '../helpers/hasJsonDiffLib' );
const { requireExtensions } = require( '../../../../../tests/api-testing/utils' );

describe( 'Auth', () => {

	let itemId;
	let statementId;
	let stringPropertyId;

	before( async () => {
		stringPropertyId = ( await createUniqueStringProperty() ).entity.id;
		const createEntityResponse = await createItemWithStatements( [
			newStatementWithRandomStringValue( stringPropertyId )
		] );
		itemId = createEntityResponse.entity.id;
		statementId = createEntityResponse.entity.claims[ stringPropertyId ][ 0 ].id;
	} );

	const editRequests = [
		{
			newRequestBuilder: () => new RequestBuilder()
				.withRoute( 'POST', '/entities/items/{item_id}/statements' )
				.withPathParam( 'item_id', itemId )
				.withJsonBodyParam( 'statement', newStatementWithRandomStringValue( stringPropertyId ) ),
			expectedStatusCode: 201
		},
		{
			newRequestBuilder: () => new RequestBuilder()
				.withRoute( 'PUT', '/entities/items/{item_id}/statements/{statement_id}' )
				.withPathParam( 'item_id', itemId )
				.withPathParam( 'statement_id', statementId )
				.withJsonBodyParam( 'statement', newStatementWithRandomStringValue( stringPropertyId ) )
		},
		{
			newRequestBuilder: () => new RequestBuilder()
				.withRoute( 'PUT', '/statements/{statement_id}' )
				.withPathParam( 'statement_id', statementId )
				.withJsonBodyParam( 'statement', newStatementWithRandomStringValue( stringPropertyId ) )
		},
		{
			newRequestBuilder: () => new RequestBuilder()
				.withRoute( 'DELETE', '/entities/items/{item_id}/statements/{statement_id}' )
				.withPathParam( 'item_id', itemId )
				.withPathParam( 'statement_id', statementId ),
			isDestructive: true
		},
		{
			newRequestBuilder: () => new RequestBuilder()
				.withRoute( 'DELETE', '/statements/{statement_id}' )
				.withPathParam( 'statement_id', statementId ),
			isDestructive: true
		}
	];

	if ( hasJsonDiffLib() ) { // awaiting security review (T316245)
		editRequests.push( {
			newRequestBuilder: () => new RequestBuilder()
				.withRoute( 'PATCH', '/entities/items/{item_id}/statements/{statement_id}' )
				.withPathParam( 'item_id', itemId )
				.withPathParam( 'statement_id', statementId )
				.withJsonBodyParam( 'patch', [
					{
						op: 'replace',
						path: '/mainsnak',
						value: newStatementWithRandomStringValue( stringPropertyId ).mainsnak
					}
				] )
		} );
		editRequests.push( {
			newRequestBuilder: () => new RequestBuilder()
				.withRoute( 'PATCH', '/statements/{statement_id}' )
				.withPathParam( 'statement_id', statementId )
				.withJsonBodyParam( 'patch', [
					{
						op: 'replace',
						path: '/mainsnak',
						value: newStatementWithRandomStringValue( stringPropertyId ).mainsnak
					}
				] )
		} );
	}

	[
		{
			newRequestBuilder: () => new RequestBuilder()
				.withRoute( 'GET', '/entities/items/{item_id}/statements' )
				.withPathParam( 'item_id', itemId )
		},
		{
			newRequestBuilder: () => new RequestBuilder()
				.withRoute( 'GET', '/entities/items/{item_id}/statements/{statement_id}' )
				.withPathParam( 'item_id', itemId )
				.withPathParam( 'statement_id', statementId )
		},
		{
			newRequestBuilder: () => new RequestBuilder()
				.withRoute( 'GET', '/entities/items/{item_id}' )
				.withPathParam( 'item_id', itemId )
		},
		{
			newRequestBuilder: () => new RequestBuilder()
				.withRoute( 'GET', '/statements/{statement_id}' )
				.withPathParam( 'statement_id', statementId )
		},
		...editRequests
	].forEach( ( { newRequestBuilder, expectedStatusCode = 200, isDestructive } ) => {
		describe( `Authentication - ${newRequestBuilder().getRouteDescription()}`, () => {

			afterEach( async () => {
				if ( isDestructive ) {
					const createStatementResponse = await new RequestBuilder()
						.withRoute( 'POST', '/entities/items/{item_id}/statements' )
						.withPathParam( 'item_id', itemId )
						.withJsonBodyParam( 'statement', newStatementWithRandomStringValue( stringPropertyId ) )
						.makeRequest();
					statementId = createStatementResponse.body.id;
				}
			} );

			it( 'has an X-Authenticated-User header with the logged in user', async () => {
				const mindy = await action.mindy();

				const response = await newRequestBuilder().withUser( mindy ).makeRequest();

				assert.strictEqual( response.statusCode, expectedStatusCode );
				assert.header( response, 'X-Authenticated-User', mindy.username );
			} );

			describe.skip( 'OAuth', () => { // Skipping due to apache auth header issues. See T305709
				before( requireExtensions( [ 'OAuth' ] ) );

				it( 'responds with an error given an invalid bearer token', async () => {
					const response = newRequestBuilder()
						.withHeader( 'Authorization', 'Bearer this-is-an-invalid-token' )
						.makeRequest();

					assert.strictEqual( response.status, 403 );
				} );
			} );
		} );
	} );

	describe( 'Authorization', () => {
		before( async () => {
			await protectItem( itemId );
		} );

		editRequests.forEach( ( { newRequestBuilder } ) => {
			it( `Permission denied for protected item - ${newRequestBuilder().getRouteDescription()}`, async () => {
				const response = await newRequestBuilder().makeRequest();

				assert.strictEqual( response.status, 403 );
				assert.strictEqual( response.body.httpCode, 403 );
				assert.strictEqual( response.body.httpReason, 'Forbidden' );
				assert.strictEqual( response.body.error, 'rest-write-denied' );
			} );
		} );
	} );
} );