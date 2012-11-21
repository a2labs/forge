/*
    forge - A Node.js tool for continuous integration
    version:    0.0.1
    author:     Brian Edgerton <bedgerton@appendto.com> (http://appendto.com)
    copyright:  2012
    license:    Dual licensed
                MIT (http://www.opensource.org/licenses/mit-license)
                GPL (http://www.opensource.org/licenses/gpl-license)
*/

var _s = require( "underscore.string" ),
    sanitizeOptName = function( name ) {
        return name.replace(/^\-+/, '');
    };

exports.parse = function(args) {

    var parsed = {
        options: {},
        app: null,
        app_options: []
    };


    for ( var i = 2, j = args.length; i < j; i++ ) {

        if ( parsed.app === null && _s.startsWith( args[i], "-" ) ) {
            parsed.options[ sanitizeOptName( args[ i ] ) ] = true;
        } else if ( parsed.app === null ) {
            parsed.app = args[ i ];
        } else {
            parsed.app_options.push( args[ i ] );
        }
    }

    return parsed;
};