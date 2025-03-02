'use strict';

const { assert, utils, action } = require( 'api-testing' );
const { expect } = require( '../helpers/chaiHelper' );
const entityHelper = require( '../helpers/entityHelper' );
const testValidatesPatch = require( '../helpers/testValidatesPatch' );
const { newPatchItemDescriptionsRequestBuilder } = require( '../helpers/RequestBuilderFactory' );
const { formatTermsEditSummary } = require( '../helpers/formatEditSummaries' );
const { makeEtag } = require( '../helpers/httpHelper' );
const { assertValidError } = require( '../helpers/responseValidator' );
const { getOrCreateBotUser } = require( '../helpers/botUser' );

describe( newPatchItemDescriptionsRequestBuilder().getRouteDescription(), () => {

	let testItemId;
	let testLabel;
	let testDescription;
	let originalLastModified;
	let originalRevisionId;
	const testLanguage = 'en';

	before( async function () {
		testLabel = `English Label ${utils.uniq()}`;
		testDescription = `English Description ${utils.uniq()}`;
		testItemId = ( await entityHelper.createEntity( 'item', {
			labels: [ { language: testLanguage, value: testLabel } ],
			descriptions: [ { language: testLanguage, value: testDescription } ]
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
		it( 'can add a description', async () => {
			const description = `Neues Deutsches Beschreibung ${utils.uniq()}`;
			const response = await newPatchItemDescriptionsRequestBuilder(
				testItemId,
				[ { op: 'add', path: '/de', value: description } ]
			).makeRequest();

			expect( response ).to.have.status( 200 );
			assert.strictEqual( response.body.de, description );
			assert.strictEqual( response.header[ 'content-type' ], 'application/json' );
			assert.isAbove( new Date( response.header[ 'last-modified' ] ), originalLastModified );
			assert.notStrictEqual( response.header.etag, makeEtag( originalRevisionId ) );
		} );

		it( 'trims whitespace around the description', async () => {
			const description = `spacey ${utils.uniq()}`;
			const response = await newPatchItemDescriptionsRequestBuilder(
				testItemId,
				[ { op: 'add', path: '/de', value: ` \t${description}  ` } ]
			).makeRequest();

			expect( response ).to.have.status( 200 );
			assert.strictEqual( response.body.de, description );
		} );

		it( 'allows content-type application/json-patch+json', async () => {
			const description = `Neues Deutsches Beschreibung ${utils.uniq()}`;
			const response = await newPatchItemDescriptionsRequestBuilder(
				testItemId,
				[ { op: 'add', path: '/de', value: description } ]
			)
				.withHeader( 'content-type', 'application/json-patch+json' )
				.assertValidRequest().makeRequest();

			expect( response ).to.have.status( 200 );
			assert.strictEqual( response.body.de, description );
		} );

		it( 'can patch descriptions with edit metadata', async () => {
			const description = `${utils.uniq()} وصف عربي جديد`;
			const user = await getOrCreateBotUser();
			const tag = await action.makeTag( 'e2e test tag', 'Created during e2e test', true );
			const comment = 'I made a patch';
			const response = await newPatchItemDescriptionsRequestBuilder(
				testItemId,
				[ { op: 'add', path: '/ar', value: description } ]
			)
				.withJsonBodyParam( 'tags', [ tag ] )
				.withJsonBodyParam( 'bot', true )
				.withJsonBodyParam( 'comment', comment )
				.withUser( user )
				.assertValidRequest()
				.makeRequest();

			expect( response ).to.have.status( 200 );
			assert.strictEqual( response.body.ar, description );
			assert.strictEqual( response.header[ 'content-type' ], 'application/json' );
			assert.isAbove( new Date( response.header[ 'last-modified' ] ), originalLastModified );
			assert.notStrictEqual( response.header.etag, makeEtag( originalRevisionId ) );

			const editMetadata = await entityHelper.getLatestEditMetadata( testItemId );
			assert.include( editMetadata.tags, tag );
			assert.property( editMetadata, 'bot' );
			assert.strictEqual(
				editMetadata.comment,
				formatTermsEditSummary( 'update-languages-short', 'ar', comment )
			);
		} );
	} );

	describe( '400 error response', () => {

		it( 'invalid item id', async () => {
			const itemId = testItemId.replace( 'Q', 'P' );
			const response = await newPatchItemDescriptionsRequestBuilder( itemId, [] )
				.assertInvalidRequest().makeRequest();

			assertValidError(
				response,
				400,
				'invalid-path-parameter',
				{ parameter: 'item_id' }
			);
		} );

		testValidatesPatch( ( patch ) => newPatchItemDescriptionsRequestBuilder( testItemId, patch ) );

		it( 'invalid edit tag', async () => {
			const response = await newPatchItemDescriptionsRequestBuilder( testItemId, [] )
				.withJsonBodyParam( 'tags', [ 'invalid tag' ] ).assertValidRequest().makeRequest();

			assertValidError( response, 400, 'invalid-value', { path: '/tags/0' } );
		} );

		it( 'invalid edit tag type', async () => {
			const response = await newPatchItemDescriptionsRequestBuilder( testItemId, [] )
				.withJsonBodyParam( 'tags', 'not an array' ).assertInvalidRequest().makeRequest();

			expect( response ).to.have.status( 400 );
			assert.strictEqual( response.body.code, 'invalid-value' );
			assert.deepEqual( response.body.context, { path: '/tags' } );
		} );

		it( 'invalid bot flag type', async () => {
			const response = await newPatchItemDescriptionsRequestBuilder( testItemId, [] )
				.withJsonBodyParam( 'bot', 'not boolean' ).assertInvalidRequest().makeRequest();

			expect( response ).to.have.status( 400 );
			assert.strictEqual( response.body.code, 'invalid-value' );
			assert.deepEqual( response.body.context, { path: '/bot' } );
		} );

		it( 'comment too long', async () => {
			const response = await newPatchItemDescriptionsRequestBuilder( testItemId, [] )
				.withJsonBodyParam( 'comment', 'x'.repeat( 501 ) )
				.assertValidRequest()
				.makeRequest();

			assertValidError( response, 400, 'value-too-long', { path: '/comment', limit: 500 } );
			assert.strictEqual( response.body.message, 'The input value is too long' );
		} );

		it( 'invalid comment type', async () => {
			const response = await newPatchItemDescriptionsRequestBuilder( testItemId, [] )
				.withJsonBodyParam( 'comment', 1234 ).assertInvalidRequest().makeRequest();

			expect( response ).to.have.status( 400 );
			assert.strictEqual( response.body.code, 'invalid-value' );
			assert.deepEqual( response.body.context, { path: '/comment' } );
		} );
	} );

	describe( '404 error response', () => {
		it( 'item not found', async () => {
			const itemId = 'Q999999';
			const response = await newPatchItemDescriptionsRequestBuilder(
				itemId,
				[ { op: 'replace', path: '/en', value: utils.uniq() } ]
			).assertValidRequest().makeRequest();

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

			const response = await newPatchItemDescriptionsRequestBuilder(
				redirectSource,
				[ { op: 'replace', path: '/en', value: utils.uniq() } ]
			).assertValidRequest().makeRequest();

			assertValidError( response, 409, 'redirected-item', { 'redirect-target': redirectTarget } );
			assert.include( response.body.message, redirectSource );
			assert.include( response.body.message, redirectTarget );
		} );

		it( '"path" field target does not exist', async () => {
			const operation = { op: 'remove', path: '/path/does/not/exist' };

			const response = await newPatchItemDescriptionsRequestBuilder( testItemId, [ operation ] )
				.assertValidRequest()
				.makeRequest();

			const context = { path: '/patch/0/path' };
			assertValidError( response, 409, 'patch-target-not-found', context );
			assert.strictEqual( response.body.message, 'Target not found on resource' );
		} );

		it( '"from" field target does not exist', async () => {
			const operation = { op: 'copy', from: '/path/does/not/exist', path: '/en' };

			const response = await newPatchItemDescriptionsRequestBuilder( testItemId, [ operation ] )
				.assertValidRequest()
				.makeRequest();

			const context = { path: '/patch/0/from' };
			assertValidError( response, 409, 'patch-target-not-found', context );
			assert.strictEqual( response.body.message, 'Target not found on resource' );
		} );

		it( 'patch test condition failed', async () => {
			const operation = { op: 'test', path: '/en', value: 'potato' };
			const response = await newPatchItemDescriptionsRequestBuilder( testItemId, [ operation ] )
				.assertValidRequest()
				.makeRequest();

			assertValidError( response, 409, 'patch-test-failed', { path: '/patch/0', 'actual-value': testDescription } );
			assert.strictEqual( response.body.message, 'Test operation in the provided patch failed' );
		} );
	} );

	describe( '422 error response', () => {
		const makeReplaceExistingDescriptionPatchOperation = ( newDescription ) => ( {
			op: 'replace',
			path: `/${testLanguage}`,
			value: newDescription
		} );

		it( 'invalid description', async () => {
			const invalidDescription = 'tab characters \t not allowed';
			const response = await newPatchItemDescriptionsRequestBuilder(
				testItemId,
				[ makeReplaceExistingDescriptionPatchOperation( invalidDescription ) ]
			).assertValidRequest().makeRequest();

			const context = { language: testLanguage, value: invalidDescription };
			assertValidError( response, 422, 'patched-description-invalid', context );
			assert.include( response.body.message, invalidDescription );
			assert.include( response.body.message, `'${testLanguage}'` );
		} );

		it( 'invalid description type', async () => {
			const invalidDescription = { object: 'not allowed' };
			const response = await newPatchItemDescriptionsRequestBuilder(
				testItemId,
				[ makeReplaceExistingDescriptionPatchOperation( invalidDescription ) ]
			).assertValidRequest().makeRequest();

			const context = { language: testLanguage, value: JSON.stringify( invalidDescription ) };
			assertValidError( response, 422, 'patched-description-invalid', context );
			assert.include( response.body.message, JSON.stringify( invalidDescription ) );
			assert.include( response.body.message, `'${testLanguage}'` );
		} );

		it( 'empty description', async () => {
			const response = await newPatchItemDescriptionsRequestBuilder(
				testItemId,
				[ makeReplaceExistingDescriptionPatchOperation( '' ) ]
			).assertValidRequest().makeRequest();

			assertValidError( response, 422, 'patched-description-empty', { language: testLanguage } );
		} );

		it( 'empty description after trimming whitespace in the input', async () => {
			const response = await newPatchItemDescriptionsRequestBuilder(
				testItemId,
				[ makeReplaceExistingDescriptionPatchOperation( ' \t ' ) ]
			).assertValidRequest().makeRequest();

			assertValidError( response, 422, 'patched-description-empty', { language: testLanguage } );
		} );

		it( 'description too long', async () => {
			// this assumes the default value of 250 from Wikibase.default.php is in place and
			// may fail if $wgWBRepoSettings['string-limits']['multilang']['length'] is overwritten
			const maxLength = 250;
			const tooLongDescription = 'x'.repeat( maxLength + 1 );
			const response = await newPatchItemDescriptionsRequestBuilder(
				testItemId,
				[ makeReplaceExistingDescriptionPatchOperation( tooLongDescription ) ]
			).assertValidRequest().makeRequest();

			const context = { value: tooLongDescription, 'character-limit': maxLength, language: testLanguage };
			assertValidError( response, 422, 'patched-description-too-long', context );
			assert.strictEqual(
				response.body.message,
				`Changed description for '${testLanguage}' must not be more than ${maxLength} characters long`
			);
		} );

		[ 'invalid-language-code', 'mul' ].forEach( ( language ) => {
			it( `invalid language code: "${language}"`, async () => {
				const response = await newPatchItemDescriptionsRequestBuilder(
					testItemId,
					[ { op: 'add', path: `/${language}`, value: 'potato' } ]
				).withHeader( 'X-Wikibase-Ci-Enable-Mul', 'true' ).assertValidRequest().makeRequest();

				assertValidError( response, 422, 'patched-descriptions-invalid-language-code', { language } );
				assert.include( response.body.message, language );
			} );
		} );

		it( 'patched label and description already exists in a different item', async () => {
			const label = `test-label-${utils.uniq()}`;
			const description = `test-description-${utils.uniq()}`;
			const existingItemId = ( await entityHelper.createEntity( 'item', {
				labels: [ { language: testLanguage, value: label } ],
				descriptions: [ { language: testLanguage, value: description } ]
			} ) ).entity.id;
			const itemIdToBePatched = ( await entityHelper.createEntity( 'item', {
				labels: [ { language: testLanguage, value: label } ],
				descriptions: [ { language: testLanguage, value: `description-to-be-replaced-${utils.uniq()}` } ]
			} ) ).entity.id;

			const response = await newPatchItemDescriptionsRequestBuilder(
				itemIdToBePatched,
				[ { op: 'replace', path: `/${testLanguage}`, value: description } ]
			).assertValidRequest().makeRequest();

			const context = { language: testLanguage, label, description, 'matching-item-id': existingItemId };
			assertValidError( response, 422, 'patched-item-label-description-duplicate', context );
			assert.include( response.body.message, existingItemId );
			assert.include( response.body.message, description );
			assert.include( response.body.message, testLanguage );
		} );

		it( 'patched-item-label-description-same-value', async () => {
			const response = await newPatchItemDescriptionsRequestBuilder(
				testItemId,
				[ makeReplaceExistingDescriptionPatchOperation( testLabel ) ]
			).assertValidRequest().makeRequest();

			assertValidError( response, 422, 'patched-item-label-description-same-value', { language: testLanguage } );
			assert.strictEqual(
				response.body.message,
				`Label and description for language code ${testLanguage} can not have the same value.`
			);
		} );
	} );

} );
