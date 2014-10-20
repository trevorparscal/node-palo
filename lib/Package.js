var OO = require( 'oojs' ),
	path = require( 'path' ),
	fs = require( 'co-fs' ),
	ay = require( 'ay' ),
	ModuleProvider = require( './providers/ModuleProvider' ),
	StylesheetProvider = require( './providers/StylesheetProvider' ),
	mainResourceTypes = {
		'.js': 'modules',
		'.css': 'stylesheets',
		'.less': 'stylesheets'
	};

function *version( dir, files ) {
	var max = yield ay( files )
		.reduce( function *( prev, curr ) {
			return Math.max(
				prev,
				( yield fs.stat( path.join( dir, curr ) ) ).mtime.getTime()
			);
		}, 100 );

	return Math.round( max / 1000 );
}

function *generateRawJson( obj, options ) {
	var key,
		out = [];

	for ( key in obj ) {
		out.push(
			JSON.stringify( key ) + ':' +
				( yield obj[key].generate( options ) )
		);
	}

	return '{' + out.join( ',' ) + '}';
}

function *generateSafeJson( obj, options ) {
	var key,
		out = {};

	for ( key in obj ) {
		out[key] = yield obj[key].generate( options );
	}

	return JSON.stringify( out );
}

/**
 * @class
 *
 * @constructor
 * @param {string} name Name
 * @param {Object} meta Meta information
 * @param {Object} resources Resources
 */
function Package( name, meta, resources ) {
	this.name = name;
	this.meta = {
		version: meta.version !== undefined ? meta.version : 1,
		dependencies: meta.dependencies || []
	};
	this.resources = {
		modules: resources.modules || {},
		stylesheets: resources.stylesheets || {},
		messages: resources.messages || {},
		templates: resources.templates || {},
		options: resources.options || {}
	};
}

/* Setup */

OO.initClass( Package );

/* Static Methods */

/**
 * Generate a package object from a directory.
 *
 * @param {string} dir Path to package
 * @return {Package} Package object
 */
Package.static.newFromDir = function *( dir ) {
	var pkg, meta,
		resources = {},
		cfg = path.join( dir, 'bower.json' );

	if ( yield fs.exists( cfg ) ) {
		pkg = JSON.parse( yield fs.readFile( cfg ) );
	}

	// Normalize main property
	if ( !pkg.main ) {
		throw new Error( 'Cannot load package; no main entry: ' + dir );
	}
	if ( !Array.isArray( pkg.main ) ) {
		pkg.main = [ pkg.main ];
	}

	// Collect meta information
	meta = {
		version: yield version( dir, pkg.main ),
		dependencies: Object.keys( pkg.dependencies || {} )
	};

	// TODO: Prefer to use palo.json over bower.json when available

	// Group resources by type
	yield ay( pkg.main ).forEach( function *( filename ) {
		var type = mainResourceTypes[path.extname( filename )] || 'other';
		if ( resources[type] ) {
			resources[type].push( filename );
		} else {
			resources[type] = [ filename ];
		}
	} );

	// Convert resource lists to objects
	if ( resources.modules ) {
		resources.modules = {
			'.': yield ModuleProvider.static.newFromFiles(
				resources.modules.map( function ( file ) {
					return path.join( dir, file );
				} )
			)
		};
	}
	if ( resources.stylesheets ) {
		resources.stylesheets = {
			all: yield StylesheetProvider.static.newFromFiles(
				resources.stylesheets.map( function ( file ) {
					return path.join( dir, file );
				} )
			)
		};
	}

	return new Package( pkg.name, meta, resources );
};

/* Methods */

Package.prototype.getName = function () {
	return this.name;
};

Package.prototype.getMeta = function () {
	return this.meta;
};

Package.prototype.getResources = function () {
	return this.resources;
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
Package.prototype.generate = function *( options ) {
	var parts, name, type,
		components = [];

	options = options || {};

	// Single resource
	if ( options.resource ) {
		parts = options.resource.split( '/' );
		type = parts[0];
		name = parts[1];
		if ( !this.resources[type][name] ) {
			throw new Error( 'Unknown resource: packages/' + this.name + '/' + options.resource );
		}
		switch ( type ) {
			case 'modules':
				return yield this.resources[type][name].generate( options.js );
			case 'stylesheets':
				return yield this.resources[type][name].generate( options.css );
		}
		throw new Error( 'Unsupported resource type for direct loading: ' + type );
	}

	// Full package
	if ( Object.keys( this.resources.modules ).length ) {
		components.push(
			'modules:' + ( yield generateRawJson( this.resources.modules, options.js ) )
		);
	}
	if ( Object.keys( this.resources.stylesheets ).length ) {
		components.push(
			'stylesheets:' + ( yield generateSafeJson( this.resources.stylesheets, options.js ) )
		);
	}
	return 'Palo.implement(' + [
		JSON.stringify( this.name ),
		'{' + components.join( ',' ) + '}'
	].join( ',' ) + ');';
};

/* Exports */

module.exports = Package;
