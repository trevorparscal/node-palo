var OO = require( 'oojs' ),
	fs = require( 'co-fs' ),
	ay = require( 'ay' ),
	path = require( 'path' ),
	Resource = require( '../Resource' );

/**
 * File resource.
 *
 * Resources can be configured with either a string, an array of strings, or an object with a `file`
 * or `files` properties, each a string or array of strings. The normalized configuration will
 * never have a `file` property and always have a `files` property which is an array of file paths.
 * If the configuration is an object, all properties other than `file` and `files` will be passed
 * through without modification.
 *
 * @class
 * @extends {Resource}
 *
 * @constructor
 * @param {Package} pkg Package this resource is part of
 * @param {Object|string[]|string} config Resource configuration or one or more resource file paths
 * @param {string|string[]} [config.file] One or more resource file paths
 * @param {string|string[]} [config.files] One or more resource file paths
 */
function FileResource( pkg, config ) {
	var key,
		resource = this,
		dir = pkg.getDirectory(),
		cfg = { files: [] };

	// Normalize configuration
	if ( typeof config === 'string' ) {
		cfg.files.push( config );
	} else if ( Array.isArray( config ) ) {
		cfg.files = cfg.files.concat( config );
	} else {
		for ( key in config ) {
			if ( key === 'file' || key === 'files' ) {
				cfg.files = cfg.files.concat(
					Array.isArray( config[key] ) ? config[key] : [ config[key] ]
				);
			} else {
				cfg[key] = config[key];
			}
		}
	}
	cfg.files = cfg.files.map( function ( file ) {
		return path.join( dir, file );
	} );

	// Parent constructor
	FileResource.super.call( this, pkg, cfg );

	// Properties
	this.versionGenerator = function *() {
		return yield ay( cfg.files )
			.reduce( resource.reduceFileToMaximumModifiedTime, 1 );
	};
	this.contentGenerator = function *( options ) {
		return yield ay( cfg.files )
			.map( function *( file ) {
				return yield resource.mapFileToContent( file, options );
			} )
			.reduce( resource.reduceContentToConcatenatedContent, '' );
	};
}

/* Setup */

OO.inheritClass( FileResource, Resource );

/* Methods */

/**
 * Load file from disk.
 *
 * Any transformation that needs to be aware of the file path should happen during this step.
 *
 * This is a generator passed as a callback to ay map.
 *
 * @static
 * @inheritable
 * @param {string} file Path to source file
 * @param {Object} [options] Processing options
 * @return {string} File content
 * @throws {Error} If file doesn't exist
 */
FileResource.prototype.mapFileToContent = function *( file, options ) {
	if ( !( yield fs.exists( file ) ) ) {
		throw new Error( 'Invalid source; file does not exist: ' + file );
	}

	return yield fs.readFile( file, 'utf-8' );
};

/**
 * Concatenate source file contents.
 *
 * This is a generator passed as a callback to ay reduce.
 *
 * @static
 * @inheritable
 * @param {string} prev Previous iteration result, file content
 * @param {string} curr Current array item value, file content
 * @param {string} Concatenated source file contents
 */
FileResource.prototype.reduceContentToConcatenatedContent = function *( prev, curr ) {
	return prev + '\n' + curr;
};

/**
 * Calculate the version of file contents.
 *
 * This is a generator passed as a callback to ay reduce.
 *
 * @static
 * @inheritable
 * @param {number} prev Previous iteration result, version number
 * @param {string} curr Current array item value, file name
 * @param {number} Version of file contents
 */
FileResource.prototype.reduceFileToMaximumModifiedTime = function *( prev, curr ) {
	var stat;

	try {
		stat = yield fs.stat( curr );
		return Math.max( prev, stat.mtime.getTime() / 1000 );
	} catch ( e ) {
		if ( e.code === 'ENOENT' ) {
			throw new Error( 'Invalid source; file does not exit: ' + file );
		}
		throw e;
	}
};

/**
 * Generate resource version.
 *
 * @return {number}
 */
Resource.prototype.generateVersion = function *() {
	return yield this.versionGenerator();
};

/**
 * Generate resource content.
 *
 * @param {Object} [options] Formatting options
 * @return {string}
 */
Resource.prototype.generateContent = function *( options ) {
	return yield this.contentGenerator( options );
};

/* Exports */

module.exports = FileResource;
