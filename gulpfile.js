var gulp = require( 'gulp' ),
	jscs = require( 'gulp-jscs' ),
	jshint = require('gulp-jshint'),
	mocha = require( 'gulp-mocha' ),
	exit = require( 'gulp-exit' );

gulp.task( 'pretest', function () {
	return gulp.src( './lib/*.js' )
		.pipe( jscs() )
		.pipe( jshint() )
		.pipe( jshint.reporter( 'jshint-stylish' ) );
} );

gulp.task( 'test', function () {
	return gulp.src( './test/test.js', { read: false } )
		.pipe( mocha( { reporter: 'spec' } ) )
		.pipe( exit() );
} );
