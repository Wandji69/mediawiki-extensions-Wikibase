# Federated Properties

Federated Properties is a feature that allows a newly created Wikibase instance to use the existing Properties of another Wikibase. This enables new users evaluating Wikibase to get started without having to spend a lot of time defining basic Properties first.

## Installation

The setting is off by default. To enable Federated Properties from [Wikidata], set <code>$wgWBRepoSettings['federatedPropertiesEnabled'] = true;</code> in your wiki's <code>LocalSettings.php</code>. To configure a different source wiki, the [federatedPropertiesSourceScriptUrl setting] must be set accordingly to the source wiki's script path url, e.g. <code>$wgWBRepoSettings['federatedPropertiesSourceScriptUrl'] = 'https://wikidata.beta.wmflabs.org/w/';</code>.

## Limitations

For now the feature is not intended for production use. It is only meant to facilitate the evaluation of Wikibase as a software for third party use cases.

Federated Properties must only be enabled for a fresh Wikibase installation without any existing local Properties. Local Properties and Federated Properties cannot coexist on a Wikibase at the same time. The setting should be considered permanent after entering any data into the wiki.

## Implementation

The following sections describe the implementation details of the Federated Properties feature. It is intended for developers working on the code, and those who want to know what is going on under the hood.

### Requesting data from the source wiki

A Wikibase with Federated Properties enabled fetches data about those Properties using the source wiki's HTTP API. The two endpoints that are currently used are <code>wbsearchentities</code> for searching, and <code>wbgetentities</code> for fetching the data needed to display statements on Item pages and for making edits.

For simplicity's sake the initial API based implementations of data access services such as <code>PropertyDataTypeLookup</code> and <code>PrefetchingTermLookup</code> directly requested the data they need from the API. While effective, this naive approach generates a lot of traffic on the source wiki and is not very performant. Ideally, we want to minimize the number of requests.

As a first measure, an <code>ApiEntityLookup</code> service that wraps calls to <code>wbgetentities</code> was introduced that optimistically requests all data that could possibly be needed (data type, labels, descriptions) to render statements using the Federated Property. The service internally caches the API's response for each Property so that for the duration of an incoming request to the target wiki no data would need to be fetched more than once for the same Property. The service can also request data for multiple Properties at once, so that all data for all Properties that are used in statements of an item page could be fetched in a single request if it is done before any individual requests for Property data happen.

Unfortunately, of the two data access services implemented for Federated Properties, the <code>PropertyDataTypeLookup</code> which looks up data types one at a time is called first so that the batching functionality of the <code>ApiEntityLookup</code> doesn't come into effect. Changing the <code>PropertyDataTypeLookup</code> interface to allow batching data type lookups might work, but a more generic data prefetching mechanism for data of entities that are referenced on a given page seems like the cleaner approach.

In the past, <code>EntityInfoBuilder</code> was used to load data about entities referenced (e.g. properties in statements, or statement values) on entity pages. Upon closer inspection <code>EntityInfo</code> appears to be largely unused, and either needs to be replaced or overhauled in order to be useful for prefetching Federated Properties. See [T253125#6163636].

### Handling IDs of Federated Properties

For the MVP, version IDs of Federated Properties carry no information about their source wiki. The decision is documented in the [ADR about handling Federated Property IDs].

[Wikidata]: https://www.wikidata.org/wiki/Wikidata:Main_Page
[federatedPropertiesSourceScriptUrl setting]: @ref repo_federatedPropertiesSourceScriptUrl
[ADR about handling Federated Property IDs]: @ref adr_0010
[T253125#6163636]: https://phabricator.wikimedia.org/T253125#6163636