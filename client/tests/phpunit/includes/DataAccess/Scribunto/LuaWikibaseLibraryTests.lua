--[[
	Integration tests for the mw.wikibase module

	@license GNU GPL v2+
	@author Marius Hoch < hoo@online.de >
	@author Bene* < benestar.wikimedia@gmail.com >
]]

local testframework = require 'Module:TestFramework'

-- Integration tests

local function testGetEntityType()
	return type( mw.wikibase.getEntity() )
end

local function testGetEntitySchemaVersion()
	return mw.wikibase.getEntity().schemaVersion
end

local function testGetEntityObjectType()
	return type( mw.wikibase.getEntityObject() )
end

local function testGetBestStatementsType()
	return type( mw.wikibase.getBestStatements( 'Q199024', 'P342' ) )
end

local function testGetBestStatementsFormat()
	local directAccess = mw.dumpObject( mw.wikibase.getBestStatements( 'Q199024', 'P342' ) )
	local entityAccess = mw.dumpObject( mw.wikibase.getEntity( 'Q199024' ):getBestStatements( 'P342' ) )
	return directAccess == entityAccess
end

local function testGetAllStatementsType()
	return type( mw.wikibase.getAllStatements( 'Q199024', 'P342' ) )
end

local function testGetAllStatementsFormat()
	local directAccess = mw.dumpObject( mw.wikibase.getAllStatements( 'Q32487', 'P342' ) )
	local directBestAccess = mw.dumpObject( mw.wikibase.getBestStatements( 'Q32487', 'P342' ) )
	local entityAccess = mw.dumpObject( mw.wikibase.getEntity( 'Q32487' ).claims.P342 )

	return directBestAccess ~= directAccess and directAccess == entityAccess
end

local function testGetEntityObjectIsCloned()
	mw.wikibase.getEntityObject( 'Q199024' ).id = 'a'

	-- We should get a freshly cloned table here, so the changes above wont persist
	return mw.wikibase.getEntityObject( 'Q199024' ).id
end

local function testGetEntityObjectSchemaVersion()
	return mw.wikibase.getEntityObject().schemaVersion
end

local function testGetEntityObjectForeignLabel()
	return mw.wikibase.getEntityObject( 'Q199024' ):getLabel( 'de' )
end

local function testRenderSnak()
	local entity = mw.wikibase.getEntityObject( 'Q32487' )
	local snak = entity['claims']['P342'][1]['qualifiers']['P342'][1]

	return mw.wikibase.renderSnak( snak )
end

local function testFormatValue()
	local entity = mw.wikibase.getEntityObject( 'Q32487' )
	local snak = entity['claims']['P342'][1]['qualifiers']['P342'][1]

	return mw.wikibase.formatValue( snak )
end

local function testRenderSnaks()
	local entity = mw.wikibase.getEntityObject( 'Q32487' )
	local snaks = entity['claims']['P342'][1]['qualifiers']

	return mw.wikibase.renderSnaks( snaks )
end

local function testFormatValues()
	local entity = mw.wikibase.getEntityObject( 'Q32487' )
	local snaks = entity['claims']['P342'][1]['qualifiers']

	return mw.wikibase.formatValues( snaks )
end

local function testGetEntityUrl( expectedItemId, itemId )
	local url = mw.wikibase.getEntityUrl( itemId )

	return url:match( '//.*/' .. expectedItemId ) ~= nil
end

local tests = {
	-- Integration tests

	{ name = 'mw.wikibase.getEntityIdForCurrentPage', func = mw.wikibase.getEntityIdForCurrentPage,
	  expect = { 'Q32487' }
	},
	{ name = 'mw.wikibase.getEntityIdForTitle with existing title', func = mw.wikibase.getEntityIdForTitle,
	  args = { 'WikibaseClientDataAccessTest' },
	  expect = { 'Q32487' }
	},
	{ name = 'mw.wikibase.getEntityIdForTitle with non existing title', func = mw.wikibase.getEntityIdForTitle,
	  args = { 'Bar' },
	  expect = { nil }
	},
	{ name = 'mw.wikibase.getEntityIdForTitle with invalid title', func = mw.wikibase.getEntityIdForTitle,
	  args = { 'a<a' },
	  expect = { nil }
	},
	{ name = 'mw.wikibase.getEntityIdForTitle with existing page and site id', func = mw.wikibase.getEntityIdForTitle,
		args = { 'FooBarFoo', 'fooSiteId' },
		expect = { 'Q32487' }
	},
	{ name = 'mw.wikibase.getEntityIdForTitle with non existing site id', func = mw.wikibase.getEntityIdForTitle,
		args = { 'FooBarFoo', 'bar' },
		expect = { nil }
	},
	{ name = 'mw.wikibase.getEntity (type)', func = testGetEntityType, type='ToString',
	  expect = { 'table' }
	},
	{ name = 'mw.wikibase.getEntity (schema version)', func = testGetEntitySchemaVersion,
	  expect = { 2 }
	},
	{ name = 'mw.wikibase.getEntityObject (type)', func = testGetEntityObjectType, type='ToString',
	  expect = { 'table' }
	},
	{ name = 'mw.wikibase.getBestStatements (entityId must be string)', func = mw.wikibase.getBestStatements, type='ToString',
	  args = { 0, 'P12' },
	  expect = "bad argument #1 to 'getBestStatements' (string expected, got number)"
	},
	{ name = 'mw.wikibase.getBestStatements (propertyId must be string)', func = mw.wikibase.getBestStatements, type='ToString',
	  args = { 'Q2', 12 },
	  expect = "bad argument #2 to 'getBestStatements' (string expected, got number)"
	},
	{ name = 'mw.wikibase.getBestStatements (type)', func = testGetBestStatementsType, type='ToString',
	  expect = { 'table' }
	},
	{ name = 'mw.wikibase.getBestStatements (format)', func = testGetBestStatementsFormat,
	  expect = { true }
	},
	{ name = 'mw.wikibase.getAllStatements (entityId must be string)', func = mw.wikibase.getAllStatements, type='ToString',
	  args = { 0, 'P12' },
	  expect = "bad argument #1 to 'getAllStatements' (string expected, got number)"
	},
	{ name = 'mw.wikibase.getAllStatements (propertyId must be string)', func = mw.wikibase.getAllStatements, type='ToString',
	  args = { 'Q2', 12 },
	  expect = "bad argument #2 to 'getAllStatements' (string expected, got number)"
	},
	{ name = 'mw.wikibase.getAllStatements (type)', func = testGetAllStatementsType, type='ToString',
	  expect = { 'table' }
	},
	{ name = 'mw.wikibase.getAllStatements (format)', func = testGetAllStatementsFormat,
	  expect = { true }
	},
	{ name = 'mw.wikibase.getEntityObject (is cloned)', func = testGetEntityObjectIsCloned, type='ToString',
	  expect = { 'Q199024' }
	},
	{ name = 'mw.wikibase.getEntityObject (schema version)', func = testGetEntityObjectSchemaVersion,
	  expect = { 2 }
	},
	{ name = "mw.wikibase.getEntityObject (foreign access - doesn't exist)", func = mw.wikibase.getEntityObject,
	  args = { 'Q1223214234' },
	  expect = { nil }
	},
	{ name = "mw.wikibase.getEntityObject (foreign access)", func = testGetEntityObjectForeignLabel,
	  expect = { 'Arbitrary access \\o/' }
	},
	{ name = 'mw.wikibase.getEntityObject (id must be string)', func = mw.wikibase.getEntityObject,
	  args = { 123 },
	  expect = "bad argument #1 to 'getEntity' (string or nil expected, got number)"
	},
	{ name = 'mw.wikibase.label (legacy alias)', func = mw.wikibase.label, type='ToString',
	  args = { 'Q32487' },
	  expect = { 'Lua Test Item' }
	},
	{ name = 'mw.wikibase.getLabel', func = mw.wikibase.getLabel, type='ToString',
	  args = { 'Q32487' },
	  expect = { 'Lua Test Item' }
	},
	{ name = 'mw.wikibase.getLabel (no such item)', func = mw.wikibase.getLabel, type='ToString',
	  args = { 'Q1224342342' },
	  expect = { nil }
	},
	{ name = 'mw.wikibase.getLabel (connected item)', func = mw.wikibase.getLabel, type='ToString',
	  args = {},
	  expect = { 'Lua Test Item' }
	},
	{ name = 'mw.wikibase.getLabel (no label)', func = mw.wikibase.getLabel, type='ToString',
	  args = { 'Q32488' },
	  expect = { nil }
	},
	{ name = 'mw.wikibase.getLabelWithLang', func = mw.wikibase.getLabelWithLang, type='ToString',
	  args = { 'Q32487' },
	  expect = { 'Lua Test Item', 'de' }
	},
	{ name = 'mw.wikibase.getLabelWithLang (no such item)', func = mw.wikibase.getLabelWithLang, type='ToString',
	  args = { 'Q1224342342' },
	  expect = { nil, nil }
	},
	{ name = 'mw.wikibase.getLabelWithLang (connected item)', func = mw.wikibase.getLabelWithLang, type='ToString',
	  args = {},
	  expect = { 'Lua Test Item', 'de' }
	},
	{ name = 'mw.wikibase.getLabelWithLang (no label)', func = mw.wikibase.getLabelWithLang, type='ToString',
	  args = { 'Q32488' },
	  expect = { nil, nil }
	},
	{ name = 'mw.wikibase.getLabelByLang (invalid id type)', func = mw.wikibase.getLabelByLang, type='ToString',
	  args = { 1, 'de' },
	  expect = "bad argument #1 to 'getLabelByLang' (string expected, got number)"
	},
	{ name = 'mw.wikibase.getLabelByLang (invalid languageCode type)', func = mw.wikibase.getLabelByLang, type='ToString',
	  args = { "Q42", 1.2 },
	  expect = "bad argument #2 to 'getLabelByLang' (string expected, got number)"
	},
	{ name = 'mw.wikibase.getLabelByLang (invalid id)', func = mw.wikibase.getLabelByLang, type='ToString',
	  args = { '-1', 'de' },
	  expect = { nil }
	},
	{ name = 'mw.wikibase.getLabelByLang 1', func = mw.wikibase.getLabelByLang, type='ToString',
	  args = { 'Q32487', 'de' },
	  expect = { 'Lua Test Item' }
	},
	{ name = 'mw.wikibase.getLabelByLang 2', func = mw.wikibase.getLabelByLang, type='ToString',
	  args = { 'Q32487', 'en' },
	  expect = { 'Test all the code paths' }
	},
	{ name = 'mw.wikibase.getLabelByLang (no such item)', func = mw.wikibase.getLabelByLang, type='ToString',
	  args = { 'Q1224342342', 'de' },
	  expect = { nil }
	},
	{ name = 'mw.wikibase.getLabelByLang (no such lang)', func = mw.wikibase.getLabelByLang, type='ToString',
	  args = { 'Q32487', 'blahblahblah' },
	  expect = { nil }
	},
	{ name = 'mw.wikibase.getLabelByLang (no label)', func = mw.wikibase.getLabelByLang, type='ToString',
	  args = { 'Q32488', 'de' },
	  expect = { nil }
	},
	{ name = 'mw.wikibase.description (legacy alias)', func = mw.wikibase.description, type='ToString',
	  args = { 'Q32487' },
	  expect = { 'Description of Q32487' }
	},
	{ name = 'mw.wikibase.getDescription', func = mw.wikibase.getDescription, type='ToString',
	  args = { 'Q32487' },
	  expect = { 'Description of Q32487' }
	},
	{ name = 'mw.wikibase.getDescription (connected item)', func = mw.wikibase.getDescription, type='ToString',
	  args = {},
	  expect = { 'Description of Q32487' }
	},
	{ name = 'mw.wikibase.getDescription (no such item)', func = mw.wikibase.getDescription, type='ToString',
	  args = { 'Q1224342342' },
	  expect = { nil }
	},
	{ name = 'mw.wikibase.getDescription (no such description)', func = mw.wikibase.getDescription, type='ToString',
	  args = { 'P342' },
	  expect = { nil }
	},
	{ name = 'mw.wikibase.getDescriptionWithLang (connected item)', func = mw.wikibase.getDescriptionWithLang, type='ToString',
	  args = {},
	  expect = { 'Description of Q32487', 'de' }
	},
	{ name = 'mw.wikibase.getDescriptionWithLang (no such item)', func = mw.wikibase.getDescriptionWithLang, type='ToString',
	  args = { 'Q1224342342' },
	  expect = { nil, nil }
	},
	{ name = 'mw.wikibase.getDescriptionWithLang (no such description)', func = mw.wikibase.getDescriptionWithLang, type='ToString',
	  args = { 'P342' },
	  expect = { nil, nil }
	},
	{ name = 'mw.wikibase.sitelink (legacy alias)', func = mw.wikibase.sitelink, type='ToString',
	  args = { 'Q32487' },
	  expect = { 'WikibaseClientDataAccessTest' }
	},
	{ name = 'mw.wikibase.getSitelink', func = mw.wikibase.getSitelink, type='ToString',
	  args = { 'Q32487' },
	  expect = { 'WikibaseClientDataAccessTest' }
	},
	{ name = 'mw.wikibase.getSitelink (invalid id given)', func = mw.wikibase.getSitelink, type='ToString',
	  args = {},
	  expect = "bad argument #1 to 'sitelink' (string expected, got nil)"
	},
	{ name = 'mw.wikibase.getSitelink', func = mw.wikibase.getSitelink, type='ToString',
	  args = { 'Q32488' },
	  expect = { nil }
	},
	{ name = 'mw.wikibase.getSitelink (with global site id)', func = mw.wikibase.getSitelink, type='ToString',
	  args = { 'Q32487', 'fooSiteId' },
	  expect = { 'FooBarFoo' }
	},
	{ name = 'mw.wikibase.getSitelink (with global site id not found)', func = mw.wikibase.getSitelink, type='ToString',
	  args = { 'Q32487', 'does-not-exist' },
	  expect = { nil }
	},
	{ name = 'mw.wikibase.renderSnak', func = testRenderSnak, type='ToString',
	  expect = { 'A qualifier Snak' }
	},
	{ name = 'mw.wikibase.renderSnak (must be table)', func = mw.wikibase.renderSnak,
	  args = { 'meep' },
	  expect = "bad argument #1 to 'renderSnak' (table expected, got string)"
	},
	{ name = 'mw.wikibase.formatValue', func = testFormatValue, type='ToString',
	  expect = { '<span>A qualifier Snak</span>' }
	},
	{ name = 'mw.wikibase.formatValue (must be table)', func = mw.wikibase.formatValue,
	  args = { 'meep' },
	  expect = "bad argument #1 to 'formatValue' (table expected, got string)"
	},
	{ name = 'mw.wikibase.renderSnaks', func = testRenderSnaks, type='ToString',
	  expect = { 'A qualifier Snak, Moar qualifiers' }
	},
	{ name = 'mw.wikibase.renderSnaks (must be table)', func = mw.wikibase.renderSnaks,
	  args = { 'meep' },
	  expect = "bad argument #1 to 'renderSnaks' (table expected, got string)"
	},
	{ name = 'mw.wikibase.formatValues', func = testFormatValues, type='ToString',
	  expect = { '<span><span>A qualifier Snak</span>, <span>Moar qualifiers</span></span>' }
	},
	{ name = 'mw.wikibase.formatValues (must be table)', func = mw.wikibase.formatValues,
	  args = { 'meep' },
	  expect = "bad argument #1 to 'formatValues' (table expected, got string)"
	},
	{ name = 'mw.wikibase.resolvePropertyId', func = mw.wikibase.resolvePropertyId,
	  args = { 'LuaTestStringProperty' },
	  expect = { 'P342' }
	},
	{ name = 'mw.wikibase.resolvePropertyId (property id passed)', func = mw.wikibase.resolvePropertyId,
	  args = { 'P342' },
	  expect = { 'P342' }
	},
	{ name = 'mw.wikibase.resolvePropertyId (label not found)', func = mw.wikibase.resolvePropertyId,
	  args = { 'foo' },
	  expect = { nil }
	},
	{ name = 'mw.wikibase.getEntityUrl (by entity id)', func = testGetEntityUrl,
	  args = { 'Q42', 'Q42' },
	  expect = { true }
	},
	{ name = 'mw.wikibase.getEntityUrl (connected page)', func = testGetEntityUrl,
	  args = { 'Q32487', nil },
	  expect = { true }
	},
	{ name = 'mw.wikibase.getEntityUrl (must be string or nil)', func = mw.wikibase.getEntityUrl,
	  args = { -1 },
	  expect = "bad argument #1 to 'getEntityUrl' (string or nil expected, got number)"
	},
	{ name = 'mw.wikibase.getEntityUrl (invalid entity id)', func = mw.wikibase.getEntityUrl,
	  args = { "BlahBlah" },
	  expect = { nil }
	},
	{ name = 'mw.wikibase.getPropertyOrder', func = mw.wikibase.getPropertyOrder,
	  expect = { { ['P1'] = 0, ['P22'] = 1, ['P11'] = 2 } }
	},
	{ name = 'mw.wikibase.orderProperties', func = mw.wikibase.orderProperties,
	  args = { { 'P22', 'P1', 'P44', 'Llama' } },
	  expect = { { 'P1', 'P22', 'P44', 'Llama' } }
	},
	{ name = 'mw.wikibase.orderProperties (must be table)', func = mw.wikibase.orderProperties,
	  args = { function() end },
	  expect = "bad argument #1 to 'orderProperties' (table expected, got function)"
	},
}

return testframework.getTestProvider( tests )
