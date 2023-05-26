<?php declare( strict_types=1 );

namespace Wikibase\Repo\Tests\RestApi\Application\UseCases\GetItemAliases;

use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Wikibase\DataModel\Entity\ItemId;
use Wikibase\Repo\RestApi\Application\UseCases\GetItemAliases\GetItemAliases;
use Wikibase\Repo\RestApi\Application\UseCases\GetItemAliases\GetItemAliasesRequest;
use Wikibase\Repo\RestApi\Application\UseCases\GetItemAliases\GetItemAliasesResponse;
use Wikibase\Repo\RestApi\Application\UseCases\GetItemAliases\GetItemAliasesValidator;
use Wikibase\Repo\RestApi\Application\UseCases\GetLatestItemRevisionMetadata;
use Wikibase\Repo\RestApi\Application\UseCases\UseCaseError;
use Wikibase\Repo\RestApi\Application\UseCases\UseCaseException;
use Wikibase\Repo\RestApi\Application\Validation\ItemIdValidator;
use Wikibase\Repo\RestApi\Domain\ReadModel\Aliases;
use Wikibase\Repo\RestApi\Domain\ReadModel\AliasesInLanguage;
use Wikibase\Repo\RestApi\Domain\Services\ItemAliasesRetriever;

/**
 * @covers \Wikibase\Repo\RestApi\Application\UseCases\GetItemAliases\GetItemAliases
 *
 * @group Wikibase
 *
 * @license GPL-2.0-or-later
 */
class GetItemAliasesTest extends TestCase {

	/**
	 * @var MockObject|GetLatestItemRevisionMetadata
	 */
	private $getRevisionMetadata;

	/**
	 * @var MockObject|ItemAliasesRetriever
	 */
	private $aliasesRetriever;

	protected function setUp(): void {
		parent::setUp();

		$this->getRevisionMetadata = $this->createStub( GetLatestItemRevisionMetadata::class );
		$this->aliasesRetriever = $this->createStub( ItemAliasesRetriever::class );
	}

	public function testSuccess(): void {
		$aliases = new Aliases(
			new AliasesInLanguage(
				'en',
				[
					'Planet Earth',
					'the Earth',
				]
			),
			new AliasesInLanguage(
				'ar',
				[
					'كوكب الأرض',
					'العالم',
				]
			),
		);

		$itemId = new ItemId( 'Q2' );
		$lastModified = '20201111070707';
		$revisionId = 2;

		$this->getRevisionMetadata = $this->createStub( GetLatestItemRevisionMetadata::class );
		$this->getRevisionMetadata->method( 'execute' )->willReturn( [ $revisionId, $lastModified ] );

		$this->aliasesRetriever = $this->createMock( ItemAliasesRetriever::class );
		$this->aliasesRetriever->expects( $this->once() )
			->method( 'getAliases' )
			->with( $itemId )
			->willReturn( $aliases );

		$request = new GetItemAliasesRequest( 'Q2' );
		$response = $this->newUseCase()->execute( $request );
		$this->assertEquals( new GetItemAliasesResponse( $aliases, $lastModified, $revisionId ), $response );
	}

	public function testGivenInvalidItemId_throws(): void {
		try {
			$this->newUseCase()->execute( new GetItemAliasesRequest( 'X321' ) );

			$this->fail( 'this should not be reached' );
		} catch ( UseCaseError $useCaseEx ) {
			$this->assertSame( UseCaseError::INVALID_ITEM_ID, $useCaseEx->getErrorCode() );
			$this->assertSame( 'Not a valid item ID: X321', $useCaseEx->getErrorMessage() );
			$this->assertNull( $useCaseEx->getErrorContext() );
		}
	}

	public function testGivenItemNotFoundOrRedirect_throws(): void {
		$itemId = new ItemId( 'Q10' );
		$expectedException = $this->createStub( UseCaseException::class );

		$this->getRevisionMetadata = $this->createStub( GetLatestItemRevisionMetadata::class );
		$this->getRevisionMetadata->method( 'execute' )
			->willThrowException( $expectedException );

		try {
			$this->newUseCase()->execute( new GetItemAliasesRequest( $itemId->getSerialization() ) );

			$this->fail( 'Exception was not thrown.' );
		} catch ( UseCaseException $e ) {
			$this->assertSame( $expectedException, $e );
		}
	}

	private function newUseCase(): GetItemAliases {
		return new GetItemAliases(
			$this->getRevisionMetadata,
			$this->aliasesRetriever,
			new GetItemAliasesValidator( new ItemIdValidator() )
		);
	}

}
