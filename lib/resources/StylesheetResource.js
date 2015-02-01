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
 *
 * @param {string} file File name
 * @param {Object} [options] Generation options
 * @param {boolean} [staticRoot] Base URL for static file access
 */
StylesheetResource.prototype.mapFileToContent = function *( file, options ) {
	var css = yield StylesheetResource.super.prototype.mapFileToContent.call( this, file ),
		ext = path.extname( file );

	if ( ext === '.less' ) {
		css = yield thunkify( less.render )( css, { filename: file } );
	}

	if ( options && options.staticRoot ) {
		css = this.remap( css, file, options.staticRoot );
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

StylesheetResource.prototype.remap = function ( data, fileName, staticRoot ) {
	if ( data && staticRoot ) {
		return data.replace( /url\s*\(\s*(['"]?)([^"'\)]*)\1\s*\)/gi, function ( match ) {
			var url, urlPath,
				dirName = path.resolve( path.dirname( fileName ) );

			match = match.replace( /\s/g, '' );
			url = match.slice( 4, -1 )
				.replace( /"|'/g, '' )
				.replace( /\\/g, '/' );

			if (
				/^\/|https:|http:|data:/i.test( url ) === false &&
				dirName.indexOf( staticRoot ) > -1
			) {
				urlPath = path.resolve( dirName + '/' + url );
				if ( urlPath.indexOf( staticRoot ) > -1 ) {
					url = staticRoot + urlPath
						.substr( urlPath.indexOf( staticRoot ) + staticRoot.length )
						.replace( /\\/g, '/' );
				}
			}

			return 'url("' + url + '")';
		} );
	}

	return data;
};

/* Exports */

module.exports = StylesheetResource;
