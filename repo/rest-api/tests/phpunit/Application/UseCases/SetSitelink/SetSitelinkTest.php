<?php declare( strict_types = 1 );

namespace Wikibase\Repo\Tests\RestApi\Application\UseCases\SetSitelink;

use PHPUnit\Framework\TestCase;
use Wikibase\DataModel\Entity\ItemId;
use Wikibase\DataModel\SiteLink as DataModelSitelink;
use Wikibase\DataModel\Tests\NewItem;
use Wikibase\Repo\RestApi\Application\Serialization\SitelinkDeserializer;
use Wikibase\Repo\RestApi\Application\UseCases\AssertItemExists;
use Wikibase\Repo\RestApi\Application\UseCases\SetSitelink\SetSitelink;
use Wikibase\Repo\RestApi\Application\UseCases\SetSitelink\SetSitelinkRequest;
use Wikibase\Repo\RestApi\Application\UseCases\SetSitelink\SetSitelinkValidator;
use Wikibase\Repo\RestApi\Application\UseCases\UseCaseError;
use Wikibase\Repo\RestApi\Application\UseCases\UseCaseException;
use Wikibase\Repo\RestApi\Domain\Model\EditMetadata;
use Wikibase\Repo\RestApi\Domain\Model\SitelinkEditSummary;
use Wikibase\Repo\RestApi\Domain\ReadModel\SiteLink;
use Wikibase\Repo\RestApi\Domain\Services\ItemRetriever;
use Wikibase\Repo\RestApi\Domain\Services\ItemUpdater;
use Wikibase\Repo\Tests\RestApi\Application\UseCaseRequestValidation\TestValidatingRequestDeserializer;
use Wikibase\Repo\Tests\RestApi\Infrastructure\DataAccess\InMemoryItemRepository;

/**
 * @covers \Wikibase\Repo\RestApi\Application\UseCases\SetSitelink\SetSitelink
 *
 * @group Wikibase
 *
 * @license GPL-2.0-or-later
 */
class SetSitelinkTest extends TestCase {

	private SetSitelinkValidator $validator;
	private AssertItemExists $assertItemExists;
	private ItemRetriever $itemRetriever;
	private ItemUpdater $itemUpdater;

	protected function setUp(): void {
		parent::setUp();
		$this->validator = new TestValidatingRequestDeserializer();
		$this->assertItemExists = $this->createStub( AssertItemExists::class );
		$this->itemRetriever = $this->createStub( ItemRetriever::class );
		$this->itemUpdater = $this->createStub( ItemUpdater::class );
	}

	public function testAddSitelink(): void {
		$itemId = new ItemId( 'Q123' );
		$siteId = InMemoryItemRepository::EN_WIKI_SITE_ID;
		$title = 'Potato';
		$badge = 'Q567';

		$itemRepo = new InMemoryItemRepository();
		$itemRepo->addItem( NewItem::withId( $itemId )->build() );
		$this->itemRetriever = $itemRepo;
		$this->itemUpdater = $itemRepo;

		$response = $this->newUseCase()->execute(
			new SetSitelinkRequest(
				"$itemId",
				$siteId,
				[ 'title' => $title, 'badges' => [ $badge ] ],
				[],
				false,
				'',
				null
			)
		);

		$this->assertEquals(
			new SiteLink( $siteId, $title, [ new ItemId( $badge ) ], InMemoryItemRepository::EN_WIKI_URL_PREFIX . $title
			),
			$response->getSitelink()
		);
		$this->assertSame( $itemRepo->getLatestRevisionId( $itemId ), $response->getRevisionId() );
		$this->assertSame( $itemRepo->getLatestRevisionTimestamp( $itemId ), $response->getLastModified() );
		$this->assertEquals(
			new EditMetadata(
				[],
				false,
				SitelinkEditSummary::newAddSummary(
					'',
					new DataModelSitelink( $siteId, $title, [ new ItemId( $badge ) ] )
				)
			),
			$itemRepo->getLatestRevisionEditMetadata( $itemId )
		);
		$this->assertFalse( $response->wasReplaced() );
	}

	public function testReplaceSitelink(): void {
		$itemId = new ItemId( 'Q123' );
		$siteId = InMemoryItemRepository::EN_WIKI_SITE_ID;
		$title = 'New_Potato';
		$badge = 'Q567';

		$itemRepo = new InMemoryItemRepository();
		$itemRepo->addItem( NewItem::withId( $itemId )->andSiteLink( $siteId, 'Old_Potato', [] )->build() );
		$this->itemRetriever = $itemRepo;
		$this->itemUpdater = $itemRepo;

		$response = $this->newUseCase()->execute(
			new SetSitelinkRequest(
				"$itemId",
				$siteId,
				[ 'title' => $title, 'badges' => [ $badge ] ],
				[],
				false,
				'',
				null
			)
		);

		$this->assertEquals(
			new SiteLink( $siteId, $title, [ new ItemId( $badge ) ], InMemoryItemRepository::EN_WIKI_URL_PREFIX . $title
			),
			$response->getSitelink()
		);
		$this->assertSame( $itemRepo->getLatestRevisionId( $itemId ), $response->getRevisionId() );
		$this->assertSame( $itemRepo->getLatestRevisionTimestamp( $itemId ), $response->getLastModified() );
		$this->assertEquals(
			new EditMetadata(
				[],
				false,
				SitelinkEditSummary::newReplaceSummary(
					'',
					new DataModelSitelink( $siteId, $title, [ new ItemId( $badge ) ] )
				)
			),
			$itemRepo->getLatestRevisionEditMetadata( $itemId )
		);
		$this->assertTrue( $response->wasReplaced() );
	}

	public function testReplaceBadgesOnly(): void {
		$itemId = new ItemId( 'Q123' );
		$siteId = InMemoryItemRepository::EN_WIKI_SITE_ID;
		$title = 'Potato';
		$badge = 'Q567';

		$itemRepo = new InMemoryItemRepository();
		$itemRepo->addItem( NewItem::withId( $itemId )->andSiteLink( $siteId, $title, [] )->build() );
		$this->itemRetriever = $itemRepo;
		$this->itemUpdater = $itemRepo;

		$response = $this->newUseCase()->execute(
			new SetSitelinkRequest(
				"$itemId",
				$siteId,
				[ 'title' => $title, 'badges' => [ $badge ] ],
				[],
				false,
				'',
				null
			)
		);

		$this->assertEquals(
			new SiteLink( $siteId, $title, [ new ItemId( $badge ) ], InMemoryItemRepository::EN_WIKI_URL_PREFIX . $title
			),
			$response->getSitelink()
		);
		$this->assertSame( $itemRepo->getLatestRevisionId( $itemId ), $response->getRevisionId() );
		$this->assertSame( $itemRepo->getLatestRevisionTimestamp( $itemId ), $response->getLastModified() );
		$this->assertEquals(
			new EditMetadata(
				[],
				false,
				SitelinkEditSummary::newReplaceBadgesSummary(
					'',
					new DataModelSitelink( $siteId, $title, [ new ItemId( $badge ) ] )
				)
			),
			$itemRepo->getLatestRevisionEditMetadata( $itemId )
		);
		$this->assertTrue( $response->wasReplaced() );
	}

	public function testGivenInvalidRequest_throws(): void {
		$expectedUseCaseRequest = $this->createStub( SetSitelinkRequest::class );
		$expectedUseCaseError = $this->createStub( UseCaseError::class );

		$this->validator = $this->createMock( SetSitelinkValidator::class );
		$this->validator->method( 'validateAndDeserialize' )->with( $expectedUseCaseRequest )->willThrowException( $expectedUseCaseError );

		try {
			$this->newUseCase()->execute( $expectedUseCaseRequest );
			$this->fail( 'this should not be reached' );
		} catch ( UseCaseError $e ) {
			$this->assertSame( $expectedUseCaseError, $e );
		}
	}

	public function testGivenItemNotFoundOrRedirect_throws(): void {
		$expectedException = $this->createStub( UseCaseException::class );
		$this->assertItemExists->method( 'execute' )->willThrowException( $expectedException );

		try {
			$this->newUseCase()->execute(
				new SetSitelinkRequest(
					'Q123',
					'enwiki',
					[ 'title' => 'title', 'badges' => [ 'Q321' ] ],
					[],
					false,
					'',
					null
				)
			);
			$this->fail( 'this should not be reached' );
		} catch ( UseCaseException $e ) {
			$this->assertSame( $expectedException, $e );
		}
	}

	private function newUseCase(): SetSitelink {
		return new SetSitelink(
			$this->validator,
			new SitelinkDeserializer(),
			$this->assertItemExists,
			$this->itemRetriever,
			$this->itemUpdater
		);
	}

}
