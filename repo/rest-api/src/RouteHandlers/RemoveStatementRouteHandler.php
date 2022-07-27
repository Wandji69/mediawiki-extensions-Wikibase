<?php declare( strict_types=1 );

namespace Wikibase\Repo\RestApi\RouteHandlers;

use MediaWiki\Rest\Handler;
use MediaWiki\Rest\Response;
use MediaWiki\Rest\SimpleHandler;
use MediaWiki\Rest\StringStream;
use MediaWiki\Rest\Validator\BodyValidator;
use Wikibase\Repo\RestApi\Presentation\Presenters\ErrorJsonPresenter;
use Wikibase\Repo\RestApi\RouteHandlers\Middleware\AuthenticationMiddleware;
use Wikibase\Repo\RestApi\RouteHandlers\Middleware\MiddlewareHandler;
use Wikibase\Repo\RestApi\RouteHandlers\Middleware\UnexpectedErrorHandlerMiddleware;
use Wikibase\Repo\RestApi\UseCases\RemoveItemStatement\RemoveItemStatement;
use Wikibase\Repo\RestApi\UseCases\RemoveItemStatement\RemoveItemStatementErrorResponse;
use Wikibase\Repo\RestApi\UseCases\RemoveItemStatement\RemoveItemStatementRequest;
use Wikibase\Repo\RestApi\UseCases\RemoveItemStatement\RemoveItemStatementSuccessResponse;
use Wikibase\Repo\RestApi\WbRestApi;
use Wikibase\Repo\WikibaseRepo;
use Wikimedia\ParamValidator\ParamValidator;

/**
 * @license GPL-2.0-or-later
 */
class RemoveStatementRouteHandler extends SimpleHandler {

	public const STATEMENT_ID_PATH_PARAM = 'statement_id';
	public const TAGS_BODY_PARAM = 'tags';
	public const BOT_BODY_PARAM = 'bot';
	public const COMMENT_BODY_PARAM = 'comment';

	private const TAGS_PARAM_SETTINGS = [
		self::PARAM_SOURCE => 'body',
		ParamValidator::PARAM_TYPE => 'array',
		ParamValidator::PARAM_REQUIRED => false,
		ParamValidator::PARAM_DEFAULT => []
	];
	private const BOT_PARAM_SETTINGS = [
		self::PARAM_SOURCE => 'body',
		ParamValidator::PARAM_TYPE => 'boolean',
		ParamValidator::PARAM_REQUIRED => false,
		ParamValidator::PARAM_DEFAULT => false
	];
	private const COMMENT_PARAM_SETTINGS = [
		self::PARAM_SOURCE => 'body',
		ParamValidator::PARAM_TYPE => 'string',
		ParamValidator::PARAM_REQUIRED => false,
	];

	private $removeItemStatement;
	private $responseFactory;
	private $middlewareHandler;

	public function __construct(
		RemoveItemStatement $removeItemStatement,
		ResponseFactory $responseFactory,
		MiddlewareHandler $middlewareHandler
	) {
		$this->removeItemStatement = $removeItemStatement;
		$this->responseFactory = $responseFactory;
		$this->middlewareHandler = $middlewareHandler;
	}

	public static function factory(): Handler {
		$responseFactory = new ResponseFactory( new ErrorJsonPresenter() );
		return new self(
			WbRestApi::getRemoveItemStatement(),
			new ResponseFactory( new ErrorJsonPresenter() ),
			new MiddlewareHandler( [
				new UnexpectedErrorHandlerMiddleware( $responseFactory, WikibaseRepo::getLogger() ),
				new AuthenticationMiddleware()
			] )
		);
	}

	/**
	 * @param mixed ...$args
	 */
	public function run( ...$args ): Response {
		return $this->middlewareHandler->run( $this, [ $this, 'runUseCase' ], $args );
	}

	public function runUseCase( string $statementId ): Response {
		$requestBody = $this->getValidatedBody();
		$useCaseResponse = $this->removeItemStatement->execute( new RemoveItemStatementRequest(
			$statementId,
			$requestBody[self::TAGS_BODY_PARAM] ?? self::TAGS_PARAM_SETTINGS[ ParamValidator::PARAM_DEFAULT ],
			$requestBody[self::BOT_BODY_PARAM] ?? self::BOT_PARAM_SETTINGS[ ParamValidator::PARAM_DEFAULT ],
			$requestBody[self::COMMENT_BODY_PARAM],
			$this->getUsername()
		) );

		if ( $useCaseResponse instanceof RemoveItemStatementSuccessResponse ) {
			$httpResponse = $this->newSuccessHttpResponse();
		} elseif ( $useCaseResponse instanceof RemoveItemStatementErrorResponse ) {
			$httpResponse = $this->responseFactory->newErrorResponse( $useCaseResponse );
		} else {
			throw new \LogicException( 'Received an unexpected use case result in ' . __CLASS__ );
		}

		return $httpResponse;
	}

	public function getParamSettings(): array {
		return [
			self::STATEMENT_ID_PATH_PARAM => [
				self::PARAM_SOURCE => 'path',
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_REQUIRED => true,
			]
		];
	}

	/**
	 * @inheritDoc
	 */
	public function getBodyValidator( $contentType ): BodyValidator {
		return new TypeValidatingJsonBodyValidator( [
			self::TAGS_BODY_PARAM => self::TAGS_PARAM_SETTINGS,
			self::BOT_BODY_PARAM => self::BOT_PARAM_SETTINGS,
			self::COMMENT_BODY_PARAM => self::COMMENT_PARAM_SETTINGS
		] );
	}

	private function newSuccessHttpResponse(): Response {
		$httpResponse = $this->getResponseFactory()->create();
		$httpResponse->setStatus( 200 );
		$httpResponse->setHeader( 'Content-Type', 'application/json' );
		$httpResponse->setHeader( 'Content-Language', 'en' );
		$httpResponse->setBody( new StringStream( "\"Statement deleted\"" ) );

		return $httpResponse;
	}

	private function getUsername(): ?string {
		$mwUser = $this->getAuthority()->getUser();
		return $mwUser->isRegistered() ? $mwUser->getName() : null;
	}

}