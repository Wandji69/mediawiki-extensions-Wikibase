<?php

namespace Wikibase\Lib\Store;

use Wikibase\DataAccess\EntitySourceLookup;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\Lib\ServiceBySourceAndTypeDispatcher;

/**
 * @license GPL-2.0-or-later
 */
class TypeDispatchingTitleTextLookup implements EntityTitleTextLookup {

	/**
	 * @var ServiceBySourceAndTypeDispatcher
	 */
	private $serviceBySourceAndTypeDispatcher;

	/**
	 * @var EntitySourceLookup
	 */
	private $entitySourceLookup;

	public function __construct(
		EntitySourceLookup $entitySourceLookup,
		ServiceBySourceAndTypeDispatcher $serviceBySourceAndTypeDispatcher
	) {
		$this->entitySourceLookup = $entitySourceLookup;
		$this->serviceBySourceAndTypeDispatcher = $serviceBySourceAndTypeDispatcher;
	}

	public function getPrefixedText( EntityId $id ): ?string {
		$entitySource = $this->entitySourceLookup->getEntitySourceById( $id );
		return $this->serviceBySourceAndTypeDispatcher->getServiceForSourceAndType( $entitySource->getSourceName(), $id->getEntityType() )
			->getPrefixedText( $id );
	}

}
