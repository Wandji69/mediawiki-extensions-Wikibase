<?php
declare( strict_types = 1 );

namespace Wikibase\Repo\Tests\Unit\ServiceWiring;

use InvalidArgumentException;
use Wikibase\Lib\DataTypeDefinitions;
use Wikibase\Repo\Rdf\ValueSnakRdfBuilderFactory;
use Wikibase\Repo\Tests\Unit\ServiceWiringTestCase;

/**
 * @coversNothing
 *
 * @group Wikibase
 *
 * @license GPL-2.0-or-later
 */
class ValueSnakRdfBuilderFactoryTest extends ServiceWiringTestCase {

	public function testConstruction(): void {
		$this->mockService( 'WikibaseRepo.DataTypeDefinitions',
			new DataTypeDefinitions( [
				'VT:test' => [
					'rdf-builder-factory-callback' => function () {
						return null;
					},
				],
			] ) );

		$valueSnakRdfBuilderFactory = $this
			->getService( 'WikibaseRepo.ValueSnakRdfBuilderFactory' );

		$this->assertInstanceOf(
			ValueSnakRdfBuilderFactory::class,
			$valueSnakRdfBuilderFactory
		);
	}

	public function testChecksCallable(): void {
		$this->mockService( 'WikibaseRepo.DataTypeDefinitions',
			new DataTypeDefinitions( [
				'VT:test' => [
					'rdf-builder-factory-callback' => true,
				],
			] ) );

		$this->expectException( InvalidArgumentException::class );
		$this->getService( 'WikibaseRepo.ValueSnakRdfBuilderFactory' );
	}

}
