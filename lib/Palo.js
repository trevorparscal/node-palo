var OO = require( 'oojs' ),
	Package = require( './Package' ),
	fs = require( 'co-fs' ),
	glob = require( 'co-glob' ),
	ay = require( 'ay' ),
	path = require( 'path' );

/**
 * List of packages.
 *
 * @class
 *
 * @constructor
 * @param {Object.<string,Package>} packages List of packages, keyed by package name
 */
function Palo( packages ) {
	this.packages = packages || {};
}

/* Setup */

OO.initClass( Palo );

/* Static Methods */

/**
 * Create a Palo loader to serve packages from a given directory.
 *
 * @param {string} dir Package directory
 * @return {Palo} Palo loader
 */
Palo.static.newFromDir = function *( dir ) {
	var data,
		local = dir,
		config = path.join( dir, '.bowerrc' ),
		installed = path.join( dir, 'bower_components' ),
		packages = {},
		dirs = {};

	if ( yield fs.exists( config ) ) {
		data = JSON.parse( yield fs.readFile( config, 'utf-8' ) );
		if ( data.directory ) {
			installed = path.join( dir, data.directory );
		}
	}

	yield ay(
		( yield glob( path.join( installed, '*/bower.json' ) ) )
			.concat( yield glob( path.join( local, '*/{bower,palo}.json' ) ) )
	)
		.forEach( function *( file ) {
			var pkg,
				dir = path.dirname( file );

			if ( dirs[dir] === undefined ) {
				dirs[dir] = true;
				pkg = yield Package.static.newFromDir( path.dirname( file ) );
				packages[pkg.getName()] = pkg;
			}
		} );

	return new Palo( packages );
};

/* Methods */

/**
 * Get all packages.
 *
 * @return {Package[]} Packages
 */
Palo.prototype.getPackages = function () {
	return this.packages;
};

/**
 * Get a package.
 *
 * @return {Package} Package
 */
Palo.prototype.getPackage = function ( name ) {
	return this.packages[name];
};

/**
 * Get available packages.
 *
 * Only available packages will be included in the result. Compare the number of available packages
 * to the number of requested packages to determine whether to reply with 200, 206 or 404.
 *
 * @param {string[]} names Package names
 * @return {Package[]} Available packages
 */
Palo.prototype.getAvailablePackages = function ( names ) {
	var packages = this.packages;

	return names
		.filter( function ( name ) {
			return packages[name] instanceof Package;
		} )
		.map( function ( name ) {
			return packages[name];
		} );
};

/**
 * Generate a package.
 *
 * Packages are wrapped in `Palo.implement` calls, which register them with the loader. An error
 * message inside a JavaScript comment will appear for each package that is not available.
 *
 * @param {string[]} names List of package names
 * @param {Object} [options] Formatting options, keyed by format type, e.g. `js` or `css`; see
 *   subclasses of Resource for more details
 * @return {string} Package implementations
 */
Palo.prototype.generatePackages = function *( names, options ) {
	var packages = this.packages;

	return ( yield ay( names )
		.map( function *( name ) {
			return packages[name] instanceof Package ?
				yield packages[name].generatePackage( options ) :
				'/* ⚠ PACKAGE UNAVAILABLE: ' + name + ' ⚠ */';
		} )
	).join( '\n\n' );
};

/* Exports */

module.exports = Palo;
