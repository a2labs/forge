/*
    forge - A Node.js tool for continuous integration
    version:    0.0.1
    author:     Brian Edgerton <bedgerton@appendto.com> (http://appendto.com)
    copyright:  2012
    license:    Dual licensed
                MIT (http://www.opensource.org/licenses/mit-license)
                GPL (http://www.opensource.org/licenses/gpl-license)
*/

var postal = require( "postal" ),
    util = require( "util" );

exports.init = function( config ) {

    postal.channel( "forge", "#" ).subscribe( function( msg ) {
        util.log( msg.data );
    });

    postal.channel( "application", "#" ).subscribe( function( msg ) {
        util.print( msg.data );
    } );

};