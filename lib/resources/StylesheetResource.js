var OO = require( 'oojs' ),
	FileResource = require( './FileResource' ),
	path = require( 'path' ),
	thunkify = require( 'thunkify' ),
	less = require( 'less' ),
	cssjanus = require( 'cssjanus' ),
	cssmin = require( 'cssmin' ),
	autoprefixer = require( 'autoprefixer-core' );

/**
 * CSS stylesheet resource.
 *
 * @class
 * @extends {FileResource}
 *
 * @constructor
 * @param {Package} pkg Package this resource is part of
 * @param {Object|string[]|string} config Resource configuration or one or more resource file paths
 */
function StylesheetResource( pkg, config ) {
	// Parent constructor
	StylesheetResource.super.call( this, pkg, config );
}

/* Setup */

OO.inheritClass( StylesheetResource, FileResource );

/* Methods */

/**
 * @inheritdoc
 */
StylesheetResource.prototype.mapFileToContent = function *( file, options ) {
	var css = yield StylesheetResource.super.prototype.mapFileToContent.call( this, file ),
		ext = path.extname( file );

	if ( ext === '.less' ) {
		css = yield thunkify( less.render )( css, { filename: file } );
	}

	return css;
};

/**
 * @inheirtdoc
 *
 * @param {Object} [options] Generation options
 * @param {boolean} [flip] Flip LTR to RTL using CSSJanus
 * @param {boolean} [comb] Cleanup and reduce duplication using CSSComb
 * @param {boolean} [autoprefix] Automatically add vendor prefixes using AutoPrefixer
 * @param {boolean} [minify] Minify using CSSMin
 */
StylesheetResource.prototype.generateContent = function *( options ) {
	var css = yield StylesheetResource.super.prototype.generateContent.call( this, options );

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

module.exports = StylesheetResource;
