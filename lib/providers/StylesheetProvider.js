var OO = require( 'oojs' ),
	Provider = require( '../Provider' ),
	path = require( 'path' ),
	thunkify = require( 'thunkify' ),
	less = require( 'less' ),
	cssjanus = require( 'cssjanus' ),
	cssmin = require( 'cssmin' ),
	autoprefixer = require( 'autoprefixer-core' );

/**
 * CSS stylesheet.
 *
 * @class
 * @extends {Provider}
 *
 * @constructor
 * @param {Function*} generator Generator that yeilds source content
 */
function StylesheetProvider( generator ) {
	StylesheetProvider.super.call( this, generator );
}

/* Setup */

OO.inheritClass( StylesheetProvider, Provider );

/* Static Methods */

StylesheetProvider.static.create = function ( generate ) {
	return new StylesheetProvider( generate );
};

/**
 * @inheritdoc
 */
StylesheetProvider.static.load = function *( file ) {
	var css = yield Provider.static.load.call( this, file ),
		ext = path.extname( file );

	if ( ext === '.less' ) {
		css = yield thunkify( less.render )( css, { filename: file } );
	}

	return css;
};

/* Methods */

/**
 * @inheirtdoc
 *
 * @param {Object} [options] Generation options
 * @param {boolean} [flip] Flip LTR to RTL using CSSJanus
 * @param {boolean} [comb] Cleanup and reduce duplication using CSSComb
 * @param {boolean} [autoprefix] Automatically add vendor prefixes using AutoPrefixer
 * @param {boolean} [minify] Minify using CSSMin
 */
StylesheetProvider.prototype.generate = function *( options ) {
	var css = yield Provider.prototype.generate.call( this, options );

	if ( options ) {
		if ( options.flip ) {
			css = cssjanus.transform( css, true );
		}
		if ( options.autoprefix ) {
			css = autoprefixer.process( css ).css;
		}
		if ( options.minify ) {
			css = cssmin( css );
		}
	}

	return css;
};

/* Exports */

module.exports = StylesheetProvider;
