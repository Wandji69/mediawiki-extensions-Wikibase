<?php

namespace Wikibase\Lib\Tests\Store;

use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Wikibase\DataAccess\EntitySourceLookup;
use Wikibase\DataAccess\Tests\NewEntitySource;
use Wikibase\DataModel\Entity\PropertyId;
use Wikibase\Lib\ServiceBySourceAndTypeDispatcher;
use Wikibase\Lib\Store\EntityTitleTextLookup;
use Wikibase\Lib\Store\TypeDispatchingTitleTextLookup;

/**
 * @covers \Wikibase\Lib\Store\TypeDispatchingTitleTextLookup
 *
 * @group Wikibase
 *
 * @license GPL-2.0-or-later
 */
class TypeDispatchingTitleTextLookupTest extends TestCase {

	/**
	 * @var MockObject|EntitySourceLookup
	 */
	private $entitySourceLookup;

	/**
	 * @var MockObject|ServiceBySourceAndTypeDispatcher
	 */
	private $serviceBySourceAndTypeDispatcher;

	protected function setUp(): void {
		parent::setUp();

		$this->entitySourceLookup = $this->createStub( EntitySourceLookup::class );
		$this->serviceBySourceAndTypeDispatcher = $this->createStub( ServiceBySourceAndTypeDispatcher::class );
	}

	public function testGivenLookupDefinedForEntityType_usesRespectiveLookup() {
		$entityId = new PropertyId( 'P321' );
		$titleText = 'Property:P321';
		$propertySourceName = 'propertySource';

		$this->propertyTitleTextLookup = $this->createMock( EntityTitleTextLookup::class );
		$this->entitySourceLookup = $this->createMock( EntitySourceLookup::class );
		$this->serviceBySourceAndTypeDispatcher = $this->createMock( ServiceBySourceAndTypeDispatcher::class );

		$this->propertyTitleTextLookup->expects( $this->once() )
			->method( 'getPrefixedText' )
			->with( $entityId )
			->willReturn( $titleText );

		$this->entitySourceLookup->expects( $this->atLeastOnce() )
			->method( 'getEntitySourceById' )
			->with( $entityId )
			->willReturn( NewEntitySource::havingName( $propertySourceName )->build() );

		$this->serviceBySourceAndTypeDispatcher->expects( $this->once() )
			->method( 'getServiceForSourceAndType' )
			->with( $propertySourceName, 'property' )
			->willReturn( $this->propertyTitleTextLookup );

		$this->assertSame( $titleText, $this->newDispatchingTitleTextLookup()->getPrefixedText( $entityId ) );
	}

	private function newDispatchingTitleTextLookup(): TypeDispatchingTitleTextLookup {
		return new TypeDispatchingTitleTextLookup(
			$this->entitySourceLookup,
			$this->serviceBySourceAndTypeDispatcher
		);
	}

}
