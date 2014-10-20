var OO = require( 'oojs' ),
	Provider = require( '../Provider' ),
	uglify = require( 'uglify-js' );

/**
 * JavaScript module.
 *
 * @class
 * @extends {Provider}
 *
 * @constructor
 * @param {Function*} generator Generator that yeilds source content
 */
function ModuleProvider( generator ) {
	ModuleProvider.super.call( this, generator );
}

/* Setup */

OO.inheritClass( ModuleProvider, Provider );

/* Static Methods */

ModuleProvider.static.create = function ( generate ) {
	return new ModuleProvider( generate );
};

/* Methods */

/**
 * @inheirtdoc
 *
 * @param {Object} [options] Generation options
 * @param {boolean} [options.minify] Minify using UglifyJS
 * @param {boolean} [options.global] Do not wrap in a module closure
 */
ModuleProvider.prototype.generate = function *( options ) {
	var js = yield Provider.prototype.generate.call( this, options );

	if ( options ) {
		if ( options.minify ) {
			js = uglify.minify( js, { fromString: true } ).code;
		}
		if ( options.global ) {
			return js;
		}
	}

	return 'function(require,exports,module,global){' + js + '}';
};

/* Exports */

module.exports = ModuleProvider;
