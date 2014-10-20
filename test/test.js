var Package = require( '../lib/Package' );

describe( 'Package', function () {
	it( 'Generates implementations', function *() {
		var pkg = new Package(
				'example',
				{},
				{}
			),
			implementation = yield pkg.generate();

		if ( implementation !== 'Palo.implement("example",{modules:{},stylesheets:{}});' ) {
			throw new Error( 'Unexpected generated output:' + implementation );
		}
	} );
} );
