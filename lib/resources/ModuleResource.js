var OO = require( 'oojs' ),
	FileResource = require( './FileResource' ),
	uglify = require( 'uglify-js' );

/**
 * JavaScript module resource.
 *
 * @class
 * @extends {FileResource}
 *
 * @constructor
 * @param {Package} pkg Package this resource is part of
 * @param {Object|string[]|string} config Resource configuration or one or more resource file paths
 */
function ModuleResource( pkg, config ) {
	// Parent constructor
	ModuleResource.super.call( this, pkg, config );

	// Properties
	this.imports = config.imports || null;
	this.exports = config.exports || null;
	this.propertyNamePattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;
}

/* Setup */

OO.inheritClass( ModuleResource, FileResource );

/* Methods */

/**
 * @inheirtdoc
 *
 * @param {Object} [options] Generation options
 * @param {boolean} [options.minify] Minify using UglifyJS
 * @param {boolean} [options.global] Do not wrap in a module closure
 */
ModuleResource.prototype.generateContent = function *( options ) {
	var key, valid, error,
		imports = [],
		exports = [],
		invalid = [],
		js = yield ModuleResource.super.prototype.generateContent.call( this, options );

	if ( options ) {
		if ( options.minify ) {
			js = uglify.minify( js, { fromString: true } ).code;
		}
		if ( options.global ) {
			return js;
		}
	}

	if ( this.imports ) {
		for ( key in this.imports ) {
			if ( this.propertyNamePattern.test( key ) ) {
				imports.push( key + '=require(' + JSON.stringify( this.imports[key] ) + ')' );
			} else {
				invalid.push( key );
			}
		}
		if ( imports.length ) {
			js = 'var ' + imports.join( ',' ) + ';' + js;
		}
	}

	if ( this.exports ) {
		if ( typeof this.exports === 'string' ) {
			if ( !this.propertyNamePattern.test( this.exports ) ) {
				invalid.push( this.exports );
			} else {
				exports.push( 'module.exports=' + this.exports + ';' );
			}
		} else {
			for ( key in this.exports ) {
				valid = true;
				if ( !this.propertyNamePattern.test( this.exports[key] ) ) {
					invalid.push( this.exports[key] );
					valid = false;
				}
				if ( !this.propertyNamePattern.test( key ) ) {
					invalid.push( key );
					valid = false;
				}
				if ( valid ) {
					exports.push( 'exports.' + key + '=' + this.exports[key] + ';' );
				}
			}
		}
		if ( exports.length ) {
			js += ';' + exports.join( '' );
		}
	}

	if ( invalid.length ) {
		error = 'Palo error: invalid import/export properties (' + invalid.join( ', ' ) + ')';
		console.log( error );
		js = '\n/* ' + error + ' */\n' + js;
	}

	return 'function(require,exports,module,global){' + js + '}';
};

/* Exports */

module.exports = ModuleResource;
