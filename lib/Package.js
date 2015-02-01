var OO = require( 'oojs' ),
	path = require( 'path' ),
	fs = require( 'co-fs' ),
	Resource = require( './Resource' );

/* Functions */

/**
 * Package of resources.
 *
 * @class
 *
 * @constructor
 * @param {string} name Name
 * @param {string[]} deps Packages this package depends on
 * @param {Object} res Resources
 * @param {Object[]} res.modules Module resource configurations keyed by ID
 * @param {Object[]} res.modules Stylesheet resource configurations keyed by media type
 */
function Package( name, dir, deps, res ) {
	var type, key,
		classes = this.constructor.static.resourceClasses;

	// Properties
	this.name = name;
	this.directory = dir;
	this.dependencies = deps || [];
	this.version = null;
	this.resources = {};

	// Initialization
	for ( type in res ) {
		if ( typeof classes[type] === 'function' ) {
			this.resources[type] = {};
			for ( key in res[type] ) {
				this.resources[type][key] = new classes[type]( this, res[type][key] );
			}
		}
	}
}

/* Setup */

OO.initClass( Package );

/* Static Properties */

/**
 * Mapping of file extensions and resource types.
 *
 * @static
 * @inheritable
 * @property {Object} List of resource types keyed by file extension
 */
Package.static.resourceFileExtensions = {
	'.js': 'modules',
	'.css': 'stylesheets',
	'.less': 'stylesheets'
};

/**
 * Mapping of resource types and languages.
 *
 * @static
 * @inheritable
 * @property {Object} List of languages keyed by resource type
 */
Package.static.resourceLanguages = {
	modules: 'js',
	stylesheets: 'css'
};

/**
 * Mapping of resource types and output formats.
 *
 * @static
 * @inheritable
 * @property {Object} List of output formats keyed by resource type
 */
Package.static.resourceFormats = {
	modules: 'raw',
	stylesheets: 'object'
};

/**
 * Mapping of resource types and resource classes.
 *
 * @static
 * @inheritable
 * @property {Object} List of resource classes keyed by resource type
 */
Package.static.resourceClasses = {
	modules: require( './resources/ModuleResource' ),
	stylesheets: require( './resources/StylesheetResource' )
};

/**
 * Mapping of resource types and default keys.
 *
 * @static
 * @inheritable
 * @property {Object} List of default keys keyed by resource type
 */
Package.static.defaultResourceKeys = {
	modules: '.',
	stylesheets: 'all'
};

/* Static Methods */

Package.static.hasConfig = function *( file ) {
	return yield fs.exists( file );
};

Package.static.findConfig = function *( dir, file ) {
	var joined;

	do {
		joined = path.join( dir, file );
		if ( yield fs.exists( joined ) ) {
			return joined;
		}
		dir = path.dirname( dir );
	} while ( path.dirname( dir ) !== dir );

	return null;
};

Package.static.readConfig = function *( file ) {
	var data;

	try {
		data = yield fs.readFile( file );
	} catch ( e ) {
		throw new Error( 'Cannot read config file: ' + file + ' (' + e + ')' );
	}

	try {
		return JSON.parse( data );
	} catch ( e ) {
		throw new Error( 'Cannot parse config file: ' + file + ' (' + e + ')' );
	}
};

/**
 * Generate a package object from a directory.
 *
 * If a file name `palo.json` is present it will be used for resource information. If a file named
 * `bower.json` is present it will be used for name and dependency information, as well as a
 * fallback for resource information.
 *
 * @param {string} dir Path to package
 * @return {Package} Package object
 */
Package.static.newFromDir = function *( dir ) {
	var res, cfg, globalPaloFile,
		bowerFile = path.join( dir, 'bower.json' ),
		localPaloFile = path.join( dir, 'palo.json' ),
		pkg = ( yield this.hasConfig( bowerFile ) ) ? yield this.readConfig( bowerFile ) : {},
		deps = Object.keys( pkg.dependencies || {} ),
		name = pkg.name || path.filename( dir );

	if ( yield this.hasConfig( localPaloFile ) ) {
		// Prefer local palo resource configuration
		res = this.getResourcesFromPaloConfig( yield this.readConfig( localPaloFile ) );
	} else {
		// Look for local palo resource configuration
		globalPaloFile = yield this.findConfig( path.dirname( dir ), 'palo.json' );
		if ( globalPaloFile ) {
			// Look for an override for this package
			cfg = yield this.readConfig( globalPaloFile );
			if ( cfg && cfg.overrides && cfg.overrides[name] ) {
				// Use the overridden resource configuration
				res = this.getResourcesFromPaloConfig( cfg.overrides[name] );
			}
		}
	}
	if ( !res ) {
		// Fallback to either bower resource configuration or no resources
		res = pkg.main ? this.getResourcesFromBowerConfig( pkg ) : {};
	}

	return new Package( name, dir, deps, res );
};

/**
 * Get resource configurations from a Bower package configuration.
 *
 * @private
 * @param {Object} cfg Bower configuration
 * @return {Object} Resource configurations, keyed by resource type
 */
Package.static.getResourcesFromBowerConfig = function ( cfg ) {
	var type,
		keys = this.defaultResourceKeys,
		types = this.resourceFileExtensions,
		files = cfg.main || [],
		res = {},
		ret = {};

	// Group resources by type
	( Array.isArray( files ) ? files : [ files ] ).forEach( function ( file ) {
		var type = types[path.extname( file )] || 'other';
		if ( res[type] ) {
			res[type].push( file );
		} else {
			res[type] = [ file ];
		}
	} );

	for ( type in res ) {
		ret[type] = {};
		ret[type][keys[type]] = res[type];
	}

	return ret;
};

/**
 * Get resource configurations from a Palo package configuration.
 *
 * @private
 * @param {Object} cfg Palo configuration
 * @return {Object} Resource configurations, keyed by resource type
 */
Package.static.getResourcesFromPaloConfig = function ( cfg ) {
	var key, type,
		res = cfg.resources,
		ret = {};

	for ( type in res ) {
		ret[type] = {};
		for ( key in res[type] ) {
			ret[type][key] = res[type][key];
		}
	}

	return ret;
};

/* Methods */

Package.prototype.getName = function () {
	return this.name;
};

Package.prototype.getDirectory = function () {
	return this.directory;
};

Package.prototype.getDependencies = function () {
	return this.dependencies;
};

Package.prototype.getResources = function () {
	return this.resources;
};

/**
 * Checks if a resource is available.
 *
 * @param {string} type Resource type
 * @param {string} key Resource key
 * @return {boolean} Resource is available
 */
Package.prototype.isResourceAvailable = function ( type, key ) {
	return !!this.resources[type] && !!this.resources[type][key];
};

/**
 * Generate a version.
 *
 * The version is the highest version of all resources in the package.
 *
 * @param {number} Version number
 */
Package.prototype.generateVersion = function *() {
	var type, key,
		res = this.resources,
		max = 1;

	for ( type in res ) {
		for ( key in res[type] ) {
			max = Math.max( max, yield res[type][key].generateVersion() );
		}
	}

	return max;
};

/**
 * Generate package implementation.
 *
 * @param {Object} [options] Options
 * @param {Object} [options.js] JavaScript processing options
 * @param {Object} [options.css] CSS processing options
 * @param {string} [options.resource] Resource identifier, such as 'modules/module-name' or
 *   'stylesheets/media-type'
 */
Package.prototype.generatePackage = function *( options ) {
	var type,
		components = [],
		res = this.resources;

	options = options || {};

	for ( type in res ) {
		components.push(
			JSON.stringify( type ) + ':' + ( yield this.generateResources( type, options ) )
		);
	}
	return 'Palo.implement(' + [
		JSON.stringify( this.name ),
		'{' + components.join( ',' ) + '}'
	].join( ',' ) + ');';
};

/**
 * Generate all resources of a given type.
 *
 * @param {string} type Resource type, e.g. `modules` or `stylesheets`
 * @param {Object} [options] Formatting options, keyed by format name, see #static-resourceLanguages
 * @return {string} Resources of given type
 */
Package.prototype.generateResources = function *( type, options ) {
	var key, out,
		res = this.resources,
		format = this.constructor.static.resourceFormats[type];

	if ( !res[type] ) {
		throw new Error( 'Cannot generate resources; none matching type: ' + type );
	}

	if ( format === 'object' ) {
		out = {};
		for ( key in res[type] ) {
			out[key] = yield this.generateResource( type, key, options );
		}
		return JSON.stringify( out );
	} else if ( format === 'raw' ) {
		out = [];
		for ( key in res[type] ) {
			out.push(
				JSON.stringify( key ) + ':' + ( yield this.generateResource( type, key, options ) )
			);
		}
		return '{' + out.join( ',' ) + '}';
	} else {
		throw new Error( 'Cannot generate resources; unsupported type: ' + type );
	}
};

/**
 * Generate a resource.
 *
 * @param {string} type Resource type, e.g. `modules` or `stylesheets`
 * @param {string} key Resource key, such as the module ID or stylesheet media type
 * @param {Object} [options] Formatting options, keyed by format name, see #static-resourceLanguages
 * @return {string} Resources of given type
 */
Package.prototype.generateResource = function *( type, key, options ) {
	var res = this.resources,
		lang = this.constructor.static.resourceLanguages[type];

	if ( !res[type] || !( res[type][key] instanceof Resource ) ) {
		console.log( res[type][key] );
		throw new Error( 'Cannot generate resource; none matching key: ' + type + '/' + key );
	}

	options = ( options && options[lang] ) || {};

	return yield res[type][key].generateContent( options );
};

/* Exports */

module.exports = Package;
