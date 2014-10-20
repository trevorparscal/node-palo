var OO = require( 'oojs' ),
	fs = require( 'co-fs' ),
	ay = require( 'ay' );

/**
 * @class
 *
 * @constructor
 * @param {Function*} generator Generator that yeilds source content
 */
function Provider( generator ) {
	this.generator = generator;
}

/* Setup */

OO.initClass( Provider );

/* Static Methods */

Provider.static.create = function ( generate ) {
	return new Provider( generate );
};

/**
 * Generate a source object from files on disk.
 *
 * @static
 * @inheritable
 * @param {string[]} files Paths to source files
 * @return {Provider} Provider object
 */
Provider.static.newFromFiles = function *( files ) {
	return this.create(
		ay( files )
			.map( this.load )
			.reduce( this.concatenate, '' )
	);
};

/**
 * Load file from disk.
 *
 * Any transformation that needs to be aware of the file path should happen during this step.
 *
 * This is a generator passed as a callback to co-array map.
 *
 * @static
 * @inheritable
 * @param {string} file Path to source file
 * @throws {Error} If file doesn't exist
 */
Provider.static.load = function *( file ) {
	if ( !( yield fs.exists( file ) ) ) {
		throw new Error( 'Invalid source; file does not exit: ' + file );
	}

	return yield fs.readFile( file, 'utf-8' );
};

/**
 * Concatenate source file data.
 *
 * This is a generator passed as a callback to co-array reduce.
 *
 * @static
 * @inheritable
 * @param {string} prev Previous iteration result
 * @param {string} curr Current array item value
 * @param {string} Concatenated source file data
 */
Provider.static.concatenate = function *( prev, curr ) {
	return prev + '\n' + curr;
};

/* Methods */

/**
 * Generate source content.
 *
 * @param {Object} [options] Options
 * @return {string}
 */
Provider.prototype.generate = function *( /* options */ ) {
	return yield this.generator;
};

/* Exports */

module.exports = Provider;
