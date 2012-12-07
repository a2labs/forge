/*
    forge - A Node.js tool for continuous integration
    version:    0.1.1
    author:     Brian Edgerton <bedgerton@appendto.com> (http://appendto.com)
    copyright:  2012
    license:    Dual licensed
                MIT (http://www.opensource.org/licenses/mit-license)
                GPL (http://www.opensource.org/licenses/gpl-license)
*/

var fs = require( "fs" ),
    _ = require( "underscore" );

exports.init = function( cfg_file, options ) {
    var config = {};

    if ( fs.existsSync( cfg_file ) ) {
        var fconfig = JSON.parse( fs.readFileSync( cfg_file ) );
        config = _.deepExtend( config, fconfig );
    }

    // Look for environment overrides
    _.each( process.env, function(val, key ) {
        if ( _.str.startsWith( key, "FORGE_CFG_" ) ) {
            var new_key = key.slice( 10 ).toLowerCase();
            config[ new_key ] = val;
        }
    });

    if ( options ) {
        _.deepExtend( config, options );
    }
    
    return config;
};