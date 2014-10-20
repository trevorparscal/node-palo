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

Palo.static.newFromDir = function *( dir ) {
	var data, cfgs,
		local = dir,
		config = path.join( dir, '.bowerrc' ),
		installed = path.join( dir, 'bower_components' ),
		packages = {};

	if ( yield fs.exists( config ) ) {
		data = JSON.parse( yield fs.readFile( config, 'utf-8' ) );
		if ( data.directory ) {
			installed = path.join( dir, data.directory );
		}
	}

	cfgs = yield glob( path.join( installed, '*/bower.json' ) );
	cfgs = cfgs.concat( yield glob( path.join( local, '*/bower.json' ) ) );

	yield ay( cfgs ).forEach( function *( file ) {
		var pkg = yield Package.static.newFromDir( path.dirname( file ) );
		packages[pkg.getName()] = pkg;
	} );

	return new Palo( packages );
};

/* Methods */

Palo.prototype.getPackages = function () {
	return this.packages;
};

Palo.prototype.generate = function *( names, options ) {
	var packages = this.packages;

	return ( yield ay( Object.keys( packages ) )
		.filter( function *( name ) {
			return names.indexOf( name ) > -1;
		} )
		.map( function *( name ) {
			return yield packages[name].generate( options );
		} )
	).join( '\n' );
};

/* Exports */

module.exports = Palo;
