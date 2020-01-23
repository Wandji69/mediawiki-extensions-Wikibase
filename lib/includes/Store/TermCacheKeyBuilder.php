<?php

namespace Wikibase\Lib\Store;

use Wikibase\DataModel\Entity\EntityId;

/**
 * @license GPL-2.0-or-later
 */
class TermCacheKeyBuilder {

	public function buildKey( EntityId $id, int $revision, string $language, string $termType ) {
		return "{$id->getSerialization()}_{$revision}_{$language}_{$termType}";
	}

}
