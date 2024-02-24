'use strict';

const { assert, utils, action } = require( 'api-testing' );
const { expect } = require( '../helpers/chaiHelper' );
const entityHelper = require( '../helpers/entityHelper' );
const { newPatchSitelinksRequestBuilder } = require( '../helpers/RequestBuilderFactory' );
const { createLocalSitelink, getLocalSiteId } = require( '../helpers/entityHelper' );
const { makeEtag } = require( '../helpers/httpHelper' );
const { formatSitelinksEditSummary } = require( '../helpers/formatEditSummaries' );
const testValidatesPatch = require( '../helpers/testValidatesPatch' );
const { getAllowedBadges } = require( '../helpers/getAllowedBadges' );

describe( newPatchSitelinksRequestBuilder().getRouteDescription(), () => {

	let testItemId;
	let siteId;
	const linkedArticle = utils.title( 'Article-linked-to-test-item' );
	let originalLastModified;
	let originalRevisionId;
	let allowedBadges;

	function assertValidResponse( response, status, title, badges ) {
		expect( response ).to.have.status( status );
		assert.strictEqual( response.header[ 'content-type' ], 'application/json' );
		assert.isAbove( new Date( response.header[ 'last-modified' ] ), originalLastModified );
		assert.notStrictEqual( response.header.etag, makeEtag( originalRevisionId ) );
		assert.strictEqual( response.body[ siteId ].title, title );
		assert.deepEqual( response.body[ siteId ].badges, badges );
		assert.include( response.body[ siteId ].url, title );
	}

	function assertValidErrorResponse( response, statusCode, responseBodyErrorCode, context = null ) {
		expect( response ).to.have.status( statusCode );
		assert.header( response, 'Content-Language', 'en' );
		assert.strictEqual( response.body.code, responseBodyErrorCode );
		if ( context === null ) {
			assert.notProperty( response.body, 'context' );
		} else {
			assert.deepStrictEqual( response.body.context, context );
		}
	}

	before( async function () {
		testItemId = ( await entityHelper.createEntity( 'item', {} ) ).entity.id;
		await createLocalSitelink( testItemId, linkedArticle );
		siteId = await getLocalSiteId();
		allowedBadges = await getAllowedBadges();

		const testItemCreationMetadata = await entityHelper.getLatestEditMetadata( testItemId );
		originalLastModified = new Date( testItemCreationMetadata.timestamp );
		originalRevisionId = testItemCreationMetadata.revid;

		// wait 1s before next test to ensure the last-modified timestamps are different
		await new Promise( ( resolve ) => {
			setTimeout( resolve, 1000 );
		} );
	} );

	describe( '200 OK', () => {
		it( 'can add a sitelink', async () => {
			const sitelink = { title: linkedArticle, badges: [ allowedBadges[ 0 ] ] };
			const response = await newPatchSitelinksRequestBuilder(
				testItemId,
				[ { op: 'add', path: `/${siteId}`, value: sitelink } ]
			).makeRequest();

			assertValidResponse( response, 200, sitelink.title, sitelink.badges );
		} );

		it( 'can patch sitelinks with edit metadata', async () => {
			const sitelink = { title: linkedArticle, badges: [ allowedBadges[ 1 ] ] };
			const user = await action.robby(); // robby is a bot
			const tag = await action.makeTag( 'e2e test tag', 'Created during e2e test' );
			const editSummary = 'I made a patch';

			const response = await newPatchSitelinksRequestBuilder(
				testItemId,
				[ { op: 'add', path: `/${siteId}`, value: sitelink } ]
			).withJsonBodyParam( 'tags', [ tag ] )
				.withJsonBodyParam( 'bot', true )
				.withJsonBodyParam( 'comment', editSummary )
				.withUser( user )
				.assertValidRequest().makeRequest();

			assertValidResponse( response, 200, sitelink.title, sitelink.badges );

			const editMetadata = await entityHelper.getLatestEditMetadata( testItemId );
			assert.include( editMetadata.tags, tag );
			assert.property( editMetadata, 'bot' );
			assert.deepEqual( editMetadata.comment, formatSitelinksEditSummary( editSummary ) );
		} );
	} );

	describe( '400 error response', () => {

		it( 'invalid item id', async () => {
			const itemId = testItemId.replace( 'Q', 'P' );
			const response = await newPatchSitelinksRequestBuilder( itemId, [] )
				.assertInvalidRequest().makeRequest();

			assertValidErrorResponse( response, 400, 'invalid-item-id' );
			assert.include( response.body.message, itemId );
		} );

		testValidatesPatch( ( patch ) => newPatchSitelinksRequestBuilder( testItemId, patch ) );

		it( 'invalid edit tag', async () => {
			const invalidEditTag = 'invalid tag';
			const response = await newPatchSitelinksRequestBuilder( testItemId, [] )
				.withJsonBodyParam( 'tags', [ invalidEditTag ] ).assertValidRequest().makeRequest();

			assertValidErrorResponse( response, 400, 'invalid-edit-tag' );
			assert.include( response.body.message, invalidEditTag );
		} );

		it( 'invalid edit tag type', async () => {
			const response = await newPatchSitelinksRequestBuilder( testItemId, [] )
				.withJsonBodyParam( 'tags', 'not an array' ).assertInvalidRequest().makeRequest();

			expect( response ).to.have.status( 400 );
			assert.strictEqual( response.body.code, 'invalid-request-body' );
			assert.strictEqual( response.body.fieldName, 'tags' );
			assert.strictEqual( response.body.expectedType, 'array' );
		} );

		it( 'invalid bot flag type', async () => {
			const response = await newPatchSitelinksRequestBuilder( testItemId, [] )
				.withJsonBodyParam( 'bot', 'not boolean' ).assertInvalidRequest().makeRequest();

			expect( response ).to.have.status( 400 );
			assert.strictEqual( response.body.code, 'invalid-request-body' );
			assert.strictEqual( response.body.fieldName, 'bot' );
			assert.strictEqual( response.body.expectedType, 'boolean' );
		} );

		it( 'comment too long', async () => {
			const comment = 'x'.repeat( 501 );
			const response = await newPatchSitelinksRequestBuilder( testItemId, [] )
				.withJsonBodyParam( 'comment', comment ).assertValidRequest().makeRequest();

			assertValidErrorResponse( response, 400, 'comment-too-long' );
			assert.include( response.body.message, '500' );
		} );

		it( 'invalid comment type', async () => {
			const response = await newPatchSitelinksRequestBuilder( testItemId, [] )
				.withJsonBodyParam( 'comment', 1234 ).assertInvalidRequest().makeRequest();

			expect( response ).to.have.status( 400 );
			assert.strictEqual( response.body.code, 'invalid-request-body' );
			assert.strictEqual( response.body.fieldName, 'comment' );
			assert.strictEqual( response.body.expectedType, 'string' );
		} );

	} );

	describe( '404 error response', () => {

		it( 'item not found', async () => {
			const itemId = 'Q999999';
			const response = await newPatchSitelinksRequestBuilder( itemId, [] )
				.assertValidRequest()
				.makeRequest();

			expect( response ).to.have.status( 404 );
			assert.strictEqual( response.header[ 'content-language' ], 'en' );
			assert.strictEqual( response.body.code, 'item-not-found' );
			assert.include( response.body.message, itemId );
		} );

	} );

	describe( '409 error response', () => {

		it( 'item is a redirect', async () => {
			const redirectTarget = testItemId;
			const redirectSource = await entityHelper.createRedirectForItem( redirectTarget );

			const response = await newPatchSitelinksRequestBuilder( redirectSource, [] )
				.assertValidRequest()
				.makeRequest();

			expect( response ).to.have.status( 409 );
			assert.include( response.body.message, redirectSource );
			assert.include( response.body.message, redirectTarget );
			assert.strictEqual( response.body.code, 'redirected-item' );
		} );

		it( '"path" field target does not exist', async () => {
			const operation = { op: 'remove', path: '/path/does/not/exist' };

			const response = await newPatchSitelinksRequestBuilder( testItemId, [ operation ] )
				.assertValidRequest()
				.makeRequest();

			assertValidErrorResponse(
				response,
				409,
				'patch-target-not-found',
				{ field: 'path', operation: operation }
			);
			assert.include( response.body.message, operation.path );
		} );

		it( '"from" field target does not exist', async () => {
			const operation = { op: 'copy', from: '/path/does/not/exist', path: `/${siteId}` };

			const response = await newPatchSitelinksRequestBuilder( testItemId, [ operation ] )
				.assertValidRequest()
				.makeRequest();

			assertValidErrorResponse(
				response,
				409,
				'patch-target-not-found',
				{ field: 'from', operation: operation }
			);
			assert.include( response.body.message, operation.from );
		} );

		it( 'patch test condition failed', async () => {
			const operation = { op: 'test', path: `/${siteId}/title`, value: 'potato' };
			const response = await newPatchSitelinksRequestBuilder( testItemId, [ operation ] )
				.assertValidRequest()
				.makeRequest();

			assertValidErrorResponse(
				response,
				409,
				'patch-test-failed',
				{ operation: operation, 'actual-value': linkedArticle }
			);
			assert.include( response.body.message, operation.path );
			assert.include( response.body.message, JSON.stringify( operation.value ) );
			assert.include( response.body.message, linkedArticle );
		} );

	} );

	describe( '422 error response', () => {
		const makeReplaceExistingSitelinkPatchOperation = ( newSitelink ) => ( {
			op: 'replace',
			path: `/${siteId}`,
			value: newSitelink
		} );

		it( 'invalid site id', async () => {
			const invalidSiteId = 'not-valid-site-id';
			const sitelink = { title: linkedArticle, badges: [ allowedBadges[ 0 ] ] };

			const response = await newPatchSitelinksRequestBuilder(
				testItemId,
				[ { op: 'add', path: `/${invalidSiteId}`, value: sitelink } ]
			).assertValidRequest().makeRequest();

			assertValidErrorResponse(
				response,
				422,
				'patched-sitelink-invalid-site-id',
				{ 'site-id': invalidSiteId }
			);

			assert.include( response.body.message, invalidSiteId );
		} );

		it( 'missing title', async () => {
			const sitelink = { badges: [ allowedBadges[ 0 ] ] };

			const response = await newPatchSitelinksRequestBuilder(
				testItemId,
				[ makeReplaceExistingSitelinkPatchOperation( sitelink ) ]
			).assertValidRequest().makeRequest();

			assertValidErrorResponse(
				response,
				422,
				'patched-sitelink-missing-title',
				{ 'site-id': siteId }
			);

			assert.include( response.body.message, siteId );
		} );

		it( 'empty title', async () => {
			const sitelink = { title: '', badges: [ allowedBadges[ 0 ] ] };

			const response = await newPatchSitelinksRequestBuilder(
				testItemId,
				[ makeReplaceExistingSitelinkPatchOperation( sitelink ) ]
			).assertValidRequest().makeRequest();

			assertValidErrorResponse(
				response,
				422,
				'patched-sitelink-title-empty',
				{ 'site-id': siteId }
			);

			assert.include( response.body.message, siteId );
		} );

		it( 'invalid title', async () => {
			const invalidTitle = 'invalid??%00';
			const sitelink = { title: invalidTitle, badges: [ allowedBadges[ 0 ] ] };

			const response = await newPatchSitelinksRequestBuilder(
				testItemId,
				[ makeReplaceExistingSitelinkPatchOperation( sitelink ) ]
			).assertValidRequest().makeRequest();

			assertValidErrorResponse(
				response,
				422,
				'patched-sitelink-invalid-title',
				{ 'site-id': siteId, title: invalidTitle }
			);

			assert.include( response.body.message, siteId );
			assert.include( response.body.message, invalidTitle );
		} );

		it( 'title does not exist', async () => {
			const nonExistingTitle = 'this_title_does_not_exist';
			const sitelink = { title: nonExistingTitle, badges: [ allowedBadges[ 0 ] ] };

			const response = await newPatchSitelinksRequestBuilder(
				testItemId,
				[ makeReplaceExistingSitelinkPatchOperation( sitelink ) ]
			).assertValidRequest().makeRequest();

			assertValidErrorResponse(
				response,
				422,
				'patched-sitelink-title-does-not-exist',
				{ 'site-id': siteId, title: nonExistingTitle }
			);

			assert.include( response.body.message, siteId );
			assert.include( response.body.message, nonExistingTitle );
		} );

		it( 'invalid badge', async () => {
			const invalidBadge = 'not-an-item-id';
			const sitelink = { title: linkedArticle, badges: [ invalidBadge ] };

			const response = await newPatchSitelinksRequestBuilder(
				testItemId,
				[ makeReplaceExistingSitelinkPatchOperation( sitelink ) ]
			).assertValidRequest().makeRequest();

			assertValidErrorResponse(
				response,
				422,
				'patched-sitelink-invalid-badge',
				{ 'site-id': siteId, badge: invalidBadge }
			);

			assert.include( response.body.message, siteId );
			assert.include( response.body.message, invalidBadge );
		} );

		it( 'item not a badge', async () => {
			const notBadgeItemId = 'Q113';
			const sitelink = { title: linkedArticle, badges: [ notBadgeItemId ] };

			const response = await newPatchSitelinksRequestBuilder(
				testItemId,
				[ makeReplaceExistingSitelinkPatchOperation( sitelink ) ]
			).assertValidRequest().makeRequest();

			assertValidErrorResponse(
				response,
				422,
				'patched-sitelink-item-not-a-badge',
				{ 'site-id': siteId, badge: notBadgeItemId }
			);

			assert.include( response.body.message, siteId );
			assert.include( response.body.message, notBadgeItemId );
		} );

		it( 'badges are not a list', async () => {
			const badgesWithInvalidFormat = 'Q113, Q232, Q444';
			const sitelink = { title: linkedArticle, badges: badgesWithInvalidFormat };

			const response = await newPatchSitelinksRequestBuilder(
				testItemId,
				[ makeReplaceExistingSitelinkPatchOperation( sitelink ) ]
			).assertValidRequest().makeRequest();

			assertValidErrorResponse(
				response,
				422,
				'patched-sitelink-badges-format',
				{ 'site-id': siteId, badges: badgesWithInvalidFormat }
			);

			assert.include( response.body.message, siteId );
		} );

	} );

} );
