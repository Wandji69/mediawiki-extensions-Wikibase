'use strict';

const { assert, utils, action } = require( 'api-testing' );
const { expect } = require( '../helpers/chaiHelper' );
const entityHelper = require( '../helpers/entityHelper' );
const { newPatchItemAliasesRequestBuilder } = require( '../helpers/RequestBuilderFactory' );
const { makeEtag } = require( '../helpers/httpHelper' );
const { formatTermsEditSummary } = require( '../helpers/formatEditSummaries' );
const testValidatesPatch = require( '../helpers/testValidatesPatch' );
const { assertValidError } = require( '../helpers/responseValidator' );
const { getOrCreateBotUser } = require( '../helpers/botUser' );

describe( newPatchItemAliasesRequestBuilder().getRouteDescription(), () => {

	let testItemId;
	let testAlias;
	let originalLastModified;
	let originalRevisionId;
	const testLanguage = 'en';

	before( async function () {
		testAlias = 'English Alias';

		testItemId = ( await entityHelper.createEntity( 'item', {
			labels: [ { language: testLanguage, value: `English Label ${utils.uniq()}` } ],
			descriptions: [ { language: testLanguage, value: `English Description ${utils.uniq()}` } ],
			aliases: { en: [ { language: testLanguage, value: testAlias } ] }
		} ) ).entity.id;

		const testItemCreationMetadata = await entityHelper.getLatestEditMetadata( testItemId );
		originalLastModified = new Date( testItemCreationMetadata.timestamp );
		originalRevisionId = testItemCreationMetadata.revid;

		// wait 1s before next test to ensure the last-modified timestamps are different
		await new Promise( ( resolve ) => {
			setTimeout( resolve, 1000 );
		} );
	} );

	describe( '200 OK', () => {
		it( 'can add another alias', async () => {
			const alias = 'another English alias';
			const response = await newPatchItemAliasesRequestBuilder(
				testItemId,
				[ { op: 'add', path: '/en/-', value: alias } ]
			).makeRequest();

			expect( response ).to.have.status( 200 );
			assert.include( response.body.en, testAlias );
			assert.include( response.body.en, alias );
			assert.strictEqual( response.header[ 'content-type' ], 'application/json' );
			assert.isAbove( new Date( response.header[ 'last-modified' ] ), originalLastModified );
			assert.notStrictEqual( response.header.etag, makeEtag( originalRevisionId ) );
		} );

		it( 'trims whitespace around the alias', async () => {
			const alias = 'spacey alias';
			const response = await newPatchItemAliasesRequestBuilder(
				testItemId,
				[ { op: 'add', path: '/en/-', value: ` \t${alias}  ` } ]
			).makeRequest();

			expect( response ).to.have.status( 200 );
			assert.include( response.body.en, testAlias );
			assert.include( response.body.en, alias );
		} );

		it( 'allows content-type application/json-patch+json', async () => {
			const alias = 'Brand new English alias';
			const response = await newPatchItemAliasesRequestBuilder(
				testItemId,
				[ { op: 'add', path: '/en/-', value: alias } ]
			)
				.withHeader( 'content-type', 'application/json-patch+json' )
				.assertValidRequest().makeRequest();

			expect( response ).to.have.status( 200 );
			assert.include( response.body.en, alias );
		} );

		it( 'can patch aliases providing edit metadata', async () => {
			const newDeAlias = `de-alias-${utils.uniq()}`;
			const user = await getOrCreateBotUser();
			const tag = await action.makeTag( 'e2e test tag', 'Created during e2e test', true );
			const editSummary = 'I made a patch';
			const response = await newPatchItemAliasesRequestBuilder(
				testItemId,
				[ { op: 'add', path: '/de', value: [ newDeAlias ] } ]
			).withJsonBodyParam( 'tags', [ tag ] )
				.withJsonBodyParam( 'bot', true )
				.withJsonBodyParam( 'comment', editSummary )
				.withUser( user )
				.assertValidRequest()
				.makeRequest();

			expect( response ).to.have.status( 200 );
			assert.include( response.body.en, testAlias );
			assert.include( response.body.de, newDeAlias );

			const editMetadata = await entityHelper.getLatestEditMetadata( testItemId );
			assert.include( editMetadata.tags, tag );
			assert.property( editMetadata, 'bot' );
			assert.strictEqual(
				editMetadata.comment,
				formatTermsEditSummary( 'update-languages-short', 'de', editSummary )
			);
		} );

		it( 'can add a "mul" alias', async () => {
			const alias = `mul-alias-${utils.uniq()}`;
			const response = await newPatchItemAliasesRequestBuilder(
				testItemId,
				[ { op: 'add', path: '/mul', value: [ alias ] } ]
			).withHeader( 'X-Wikibase-Ci-Enable-Mul', 'true' ).makeRequest();

			expect( response ).to.have.status( 200 );
			assert.deepEqual( response.body.mul, [ alias ] );
		} );
	} );

	describe( '400 Bad Request', () => {
		it( 'item ID is invalid', async () => {
			const itemId = 'X123';
			const response = await newPatchItemAliasesRequestBuilder( itemId, [] )
				.assertInvalidRequest().makeRequest();

			assertValidError(
				response,
				400,
				'invalid-path-parameter',
				{ parameter: 'item_id' }
			);
		} );

		testValidatesPatch( ( patch ) => newPatchItemAliasesRequestBuilder( testItemId, patch ) );

		it( 'comment too long', async () => {
			const response = await newPatchItemAliasesRequestBuilder( testItemId, [] )
				.withJsonBodyParam( 'comment', 'x'.repeat( 501 ) )
				.assertValidRequest()
				.makeRequest();

			assertValidError( response, 400, 'value-too-long', { path: '/comment', limit: 500 } );
			assert.strictEqual( response.body.message, 'The input value is too long' );
		} );

		it( 'invalid edit tag', async () => {
			const response = await newPatchItemAliasesRequestBuilder( testItemId, [] )
				.withJsonBodyParam( 'tags', [ 'invalid tag' ] ).assertValidRequest().makeRequest();

			assertValidError( response, 400, 'invalid-value', { path: '/tags/0' } );
		} );

		it( 'invalid edit tag type', async () => {
			const response = await newPatchItemAliasesRequestBuilder( testItemId, [] )
				.withJsonBodyParam( 'tags', 'not an array' ).assertInvalidRequest().makeRequest();

			expect( response ).to.have.status( 400 );
			assert.strictEqual( response.body.code, 'invalid-value' );
			assert.deepEqual( response.body.context, { path: '/tags' } );
		} );

		it( 'invalid bot flag type', async () => {
			const response = await newPatchItemAliasesRequestBuilder( testItemId, [] )
				.withJsonBodyParam( 'bot', 'not boolean' ).assertInvalidRequest().makeRequest();

			expect( response ).to.have.status( 400 );
			assert.strictEqual( response.body.code, 'invalid-value' );
			assert.deepEqual( response.body.context, { path: '/bot' } );
		} );

		it( 'invalid comment type', async () => {
			const response = await newPatchItemAliasesRequestBuilder( testItemId, [] )
				.withJsonBodyParam( 'comment', 1234 ).assertInvalidRequest().makeRequest();

			expect( response ).to.have.status( 400 );
			assert.strictEqual( response.body.code, 'invalid-value' );
			assert.deepEqual( response.body.context, { path: '/comment' } );
		} );
	} );

	describe( '404 error response', () => {
		it( 'item not found', async () => {
			const itemId = 'Q999999';
			const response = await newPatchItemAliasesRequestBuilder( itemId, [] )
				.assertValidRequest().makeRequest();

			assertValidError( response, 404, 'item-not-found' );
			assert.include( response.body.message, itemId );
		} );
	} );

	describe( '409 error response', () => {
		it( 'item is a redirect', async () => {
			const redirectTarget = testItemId;
			const redirectSource = await entityHelper.createRedirectForItem( redirectTarget );

			const response = await newPatchItemAliasesRequestBuilder( redirectSource, [] )
				.assertValidRequest().makeRequest();

			assertValidError( response, 409, 'redirected-item', { 'redirect-target': redirectTarget } );
			assert.include( response.body.message, redirectSource );
			assert.include( response.body.message, redirectTarget );
		} );

		it( '"path" field target does not exist', async () => {
			const operation = { op: 'remove', path: '/path/does/not/exist' };

			const response = await newPatchItemAliasesRequestBuilder( testItemId, [ operation ] )
				.assertValidRequest().makeRequest();

			const context = { path: '/patch/0/path' };
			assertValidError( response, 409, 'patch-target-not-found', context );
			assert.strictEqual( response.body.message, 'Target not found on resource' );
		} );

		it( '"from" field target does not exist', async () => {
			const operation = { op: 'copy', from: '/path/does/not/exist', path: '/en' };

			const response = await newPatchItemAliasesRequestBuilder( testItemId, [ operation ] )
				.assertValidRequest().makeRequest();

			const context = { path: '/patch/0/from' };
			assertValidError( response, 409, 'patch-target-not-found', context );
			assert.strictEqual( response.body.message, 'Target not found on resource' );
		} );

		it( 'patch test condition failed', async () => {
			const operation = { op: 'test', path: '/en/0', value: 'potato' };
			const response = await newPatchItemAliasesRequestBuilder( testItemId, [ operation ] )
				.assertValidRequest().makeRequest();

			assertValidError( response, 409, 'patch-test-failed', { path: '/patch/0', 'actual-value': testAlias } );
			assert.strictEqual( response.body.message, 'Test operation in the provided patch failed' );
		} );
	} );

	describe( '422 Unprocessable Content', () => {
		it( 'empty alias', async () => {
			const language = 'de';
			const response = await newPatchItemAliasesRequestBuilder( testItemId, [
				{ op: 'add', path: `/${language}`, value: [ '' ] }
			] ).assertValidRequest().makeRequest();

			assertValidError( response, 422, 'patched-alias-empty', { language } );
		} );

		it( 'alias too long', async () => {
			const language = 'de';
			// this assumes the default value of 250 from Wikibase.default.php is in place and
			// may fail if $wgWBRepoSettings['string-limits']['multilang']['length'] is overwritten
			const maxLength = 250;
			const tooLongAlias = 'x'.repeat( maxLength + 1 );
			const response = await newPatchItemAliasesRequestBuilder( testItemId, [
				{ op: 'add', path: `/${language}`, value: [ tooLongAlias ] }
			] ).assertValidRequest().makeRequest();

			const context = { language, value: tooLongAlias, 'character-limit': maxLength };
			assertValidError( response, 422, 'patched-alias-too-long', context );
		} );

		it( 'duplicate alias', async () => {
			const language = 'en';
			const duplicate = 'tomato';
			const response = await newPatchItemAliasesRequestBuilder( testItemId, [
				{ op: 'add', path: `/${language}`, value: [ duplicate, duplicate ] }
			] ).assertValidRequest().makeRequest();

			assertValidError( response, 422, 'patched-duplicate-alias', { language, value: duplicate } );
			assert.include( response.body.message, language );
			assert.include( response.body.message, duplicate );
		} );

		it( 'alias contains invalid characters', async () => {
			const alias = 'tab\t tab\t tab';
			const response = await newPatchItemAliasesRequestBuilder( testItemId, [
				{ op: 'add', path: `/${testLanguage}`, value: [ alias ] }
			] ).assertValidRequest().makeRequest();

			assertValidError(
				response,
				422,
				'patched-aliases-invalid-field',
				{ path: `${testLanguage}/0`, value: alias }
			);
			assert.include( response.body.message, testLanguage );
		} );

		it( 'aliases in language is not a list', async () => {
			const invalidAliasesInLanguage = { object: 'not a list' };
			const response = await newPatchItemAliasesRequestBuilder( testItemId, [
				{ op: 'add', path: `/${testLanguage}`, value: invalidAliasesInLanguage }
			] ).assertValidRequest().makeRequest();

			const context = { path: testLanguage, value: invalidAliasesInLanguage };
			assertValidError( response, 422, 'patched-aliases-invalid-field', context );
			assert.include( response.body.message, testLanguage );
		} );

		it( 'aliases is not an object', async () => {
			const invalidAliases = [ 'list, not an object' ];
			const response = await newPatchItemAliasesRequestBuilder( testItemId, [
				{ op: 'add', path: '', value: invalidAliases }
			] ).assertValidRequest().makeRequest();

			const context = { path: '', value: invalidAliases };
			assertValidError( response, 422, 'patched-aliases-invalid-field', context );
			assert.strictEqual( response.body.message, "Patched value for '' is invalid" );
		} );

		it( 'invalid language code', async () => {
			const language = 'not-a-valid-language';
			const response = await newPatchItemAliasesRequestBuilder( testItemId, [
				{ op: 'add', path: `/${language}`, value: [ 'alias' ] }
			] ).assertValidRequest().makeRequest();

			assertValidError( response, 422, 'patched-aliases-invalid-language-code', { language } );
			assert.include( response.body.message, language );
		} );
	} );

} );
