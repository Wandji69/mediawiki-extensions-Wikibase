<?php declare( strict_types=1 );

namespace Wikibase\Repo\RestApi\Application\Validation;

/**
 * @license GPL-2.0-or-later
 */
class LanguageCodeValidator {

	public const CODE_INVALID_LANGUAGE_CODE = 'language-code-validator-code-invalid-language-code';

	public const CONTEXT_LANGUAGE_CODE = 'language-code-validator-context-language-code';
	public const CONTEXT_PATH = 'language-code-validator-context-path';

	private array $validLanguageCodes;

	public function __construct( array $validLanguageCodes ) {
		$this->validLanguageCodes = $validLanguageCodes;
	}

	public function validate( string $languageCode ): ?ValidationError {
		return in_array( $languageCode, $this->validLanguageCodes )
			? null
			: new ValidationError(
				self::CODE_INVALID_LANGUAGE_CODE,
				[ self::CONTEXT_LANGUAGE_CODE => $languageCode ]
			);
	}

}
