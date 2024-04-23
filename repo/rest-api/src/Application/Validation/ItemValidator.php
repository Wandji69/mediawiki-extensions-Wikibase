<?php declare( strict_types=1 );

namespace Wikibase\Repo\RestApi\Application\Validation;

use LogicException;
use Wikibase\DataModel\Entity\Item;
use Wikibase\DataModel\Term\Fingerprint;
use Wikibase\Repo\RestApi\Application\Serialization\SitelinksDeserializer;

/**
 * @license GPL-2.0-or-later
 */
class ItemValidator {

	public const CODE_INVALID_FIELD = 'invalid-item-field';
	public const CODE_UNEXPECTED_FIELD = 'item-data-unexpected-field';
	public const CODE_MISSING_LABELS_AND_DESCRIPTIONS = 'missing-labels-and-descriptions';

	public const CONTEXT_FIELD_NAME = 'field';
	public const CONTEXT_FIELD_VALUE = 'value';
	public const CONTEXT_FIELD_LABELS = 'labels';
	public const CONTEXT_FIELD_DESCRIPTIONS = 'descriptions';

	private ?Item $deserializedItem = null;
	private ItemLabelsAndDescriptionsValidator $itemLabelsAndDescriptionsValidator;
	private ItemAliasesValidator $itemAliasesValidator;
	private ItemStatementsValidator $itemStatementsValidator;
	private SitelinksDeserializer $sitelinksDeserializer;

	public function __construct(
		ItemLabelsAndDescriptionsValidator $itemLabelsAndDescriptionsValidator,
		ItemAliasesValidator $itemAliasesValidator,
		ItemStatementsValidator $itemStatementsValidator,
		SitelinksDeserializer $sitelinksDeserializer
	) {
		$this->itemLabelsAndDescriptionsValidator = $itemLabelsAndDescriptionsValidator;
		$this->itemAliasesValidator = $itemAliasesValidator;
		$this->itemStatementsValidator = $itemStatementsValidator;
		$this->sitelinksDeserializer = $sitelinksDeserializer;
	}

	public function validate( array $serialization ): ?ValidationError {
		$expectedFields = [ 'labels', 'descriptions', 'aliases', 'sitelinks', 'statements' ];
		foreach ( $expectedFields as $expectedField ) {
			$serialization[$expectedField] ??= [];
			if ( !is_array( $serialization[$expectedField] ) ) {
				return new ValidationError(
					self::CODE_INVALID_FIELD,
					[
						self::CONTEXT_FIELD_NAME => $expectedField,
						self::CONTEXT_FIELD_VALUE => $serialization[$expectedField],
					]
				);
			}
		}

		foreach ( array_keys( $serialization ) as $field ) {
			$ignoredFields = [ 'id', 'type' ];
			if ( !in_array( $field, array_merge( $expectedFields, $ignoredFields ) ) ) {
				return new ValidationError( self::CODE_UNEXPECTED_FIELD, [ self::CONTEXT_FIELD_NAME => $field ] );
			}
		}

		$validationError = $this->validateLabelsAndDescriptions( $serialization ) ??
						   $this->itemAliasesValidator->validate( $serialization['aliases'] ) ??
						   $this->itemStatementsValidator->validate( $serialization['statements'] );
		if ( $validationError ) {
			return $validationError;
		}

		$this->deserializedItem = new Item(
			null,
			new Fingerprint(
				$this->itemLabelsAndDescriptionsValidator->getValidatedLabels(),
				$this->itemLabelsAndDescriptionsValidator->getValidatedDescriptions(),
				$this->itemAliasesValidator->getValidatedAliases()
			),
			$this->sitelinksDeserializer->deserialize( $serialization['sitelinks'] ),
			$this->itemStatementsValidator->getValidatedStatements()
		);

		return null;
	}

	public function getValidatedItem(): Item {
		if ( $this->deserializedItem === null ) {
			throw new LogicException( 'getValidatedItem() called before validate()' );
		}
		return $this->deserializedItem;
	}

	private function validateLabelsAndDescriptions( array $itemSerialization ): ?ValidationError {
		$labels = $itemSerialization['labels'];
		$descriptions = $itemSerialization['descriptions'];

		if ( $labels === [] && $descriptions === [] ) {
			return new ValidationError( self::CODE_MISSING_LABELS_AND_DESCRIPTIONS );
		}

		return $this->itemLabelsAndDescriptionsValidator->validate( $labels, $descriptions );
	}

}
