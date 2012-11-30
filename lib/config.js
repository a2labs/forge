/*
    forge - A Node.js tool for continuous integration
    version:    0.0.1
    author:     Brian Edgerton <bedgerton@appendto.com> (http://appendto.com)
    copyright:  2012
    license:    Dual licensed
                MIT (http://www.opensource.org/licenses/mit-license)
                GPL (http://www.opensource.org/licenses/gpl-license)
*/

var fs = require( "fs" ),
    _ = require( "underscore" ),
    _s = require( "underscore.string" ),
    empty_config = {
        app_cfg_file: null,
        pid_dir: null,
        stdout_log: null,
        stderr_log: null,
        executable: null,
        execute: null,
        git: {
            url: null,
            revision: null
        },
        update_on_start: null,
        daemon: null,
        scripts: {
            update: null
        }
    };
exports.init = function( cfg_file, options ) {
    var config = _.extend( {}, empty_config );

    if ( fs.existsSync( cfg_file ) ) {
        config = JSON.parse( fs.readFileSync( cfg_file ) );
    }

    // Look for environment overrides
    _.each( process.env, function(val, key ) {
        if ( _s.startsWith( key, "FORGE_CFG_" ) ) {
            var new_key = key.slice( 10 ).toLowerCase();
            config[ new_key ] = val;
        }
    });

    if ( options ) {
        _.extend( config, options );
    }

    return config;
};