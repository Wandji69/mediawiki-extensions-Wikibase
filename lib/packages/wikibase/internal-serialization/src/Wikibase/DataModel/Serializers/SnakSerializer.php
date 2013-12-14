<?php

namespace Wikibase\DataModel\Serializers;

use Serializers\Exceptions\SerializationException;
use Serializers\Exceptions\UnsupportedObjectException;
use Serializers\Serializer;
use Wikibase\DataModel\Snak\Snak;

/**
 * @licence GNU GPL v2+
 * @author Jeroen De Dauw < jeroendedauw@gmail.com >
 */
class SnakSerializer implements Serializer {

	/**
	 * @see Serializer::serialize
	 *
	 * @since 1.0
	 *
	 * @param mixed $object
	 *
	 * @return array
	 * @throws SerializationException
	 */
	public function serialize( $object ) {
		if ( $this->isSerializerFor( $object ) ) {
			return $this->getSerialized( $object );
		}

		throw new UnsupportedObjectException(
			$object,
			'SnakSerializer can only serialize Snak objects'
		);
	}

	private function getSerialized( Snak $snak ) {
		return $snak->toArray();
	}

	/**
	 * @see Serializer::isSerializerFor
	 *
	 * @since 1.0
	 *
	 * @param mixed $object
	 *
	 * @return boolean
	 */
	public function isSerializerFor( $object ) {
		return is_object( $object ) && $object instanceof Snak;
	}
}