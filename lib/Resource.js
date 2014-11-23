var OO = require( 'oojs' );

/**
 * @class
 *
 * @constructor
 * @param {Package} pkg Package this resource is part of
 * @param {Object} config Resource configuration
 */
function Resource( pkg, config ) {
	var key;

	// Properties
	this.pkg = pkg;
	this.config = {};

	// Initialization
	for ( key in config ) {
		if ( Object.prototype.hasOwnProperty.call( config, key ) ) {
			this.config[key] = config[key];
		}
	}
}

/* Setup */

OO.initClass( Resource );

/* Static Methods */

/* Methods */

/**
 * Generate resource version.
 *
 * @return {number}
 */
Resource.prototype.generateVersion = function *() {
	throw new Error( 'generateVersion must be overridden in subclasses of Resource' );
};

/**
 * Generate resource content.
 *
 * @param {Object} [options] Formatting options
 * @return {string}
 */
Resource.prototype.generateContent = function *( /* options */ ) {
	throw new Error( 'generateContent must be overridden in subclasses of Resource' );
};

/* Exports */

module.exports = Resource;
