/*
    forge - A Node.js tool for continuous integration
    version:    0.1.1
    author:     Brian Edgerton <bedgerton@appendto.com> (http://appendto.com)
    copyright:  2012
    license:    Dual licensed
                MIT (http://www.opensource.org/licenses/mit-license)
                GPL (http://www.opensource.org/licenses/gpl-license)
*/

exports.parse = function( args ) {

    var parsed = {
        command: null,
        options: {
            daemon: {},
            watch: {}
        },
        app: null,
        app_options: []
    },
    program = require( "commander" );

    program
        .version( '0.0.1' )
        .option('-c, --config <file>', 'the forge configuration file to use')
        ;

    program
        .command( 'run [script]' )
        .option('-d, --daemon', 'run as background process')
        .option('-u, --update', 'attempt an application update immediately')
        .option('-w, --watch', 'watch project for changes and restart when detected')
        .description( 'run a script' )
        .action( function( script, subprogram ) {
            parsed.command = subprogram._name;
            if ( script ) {
                // Check to see if this contains the app args
                var script_array = script.split( /\s+/ );
                parsed.app = script_array[0];
                if ( script_array.length > 1 ) {
                    parsed.app_options = script_array.slice( 1 );
                }
            }
            
            if ( subprogram.daemon ) {
                parsed.options.daemon.on = subprogram.daemon;
            }

            if ( subprogram.update ) {
                parsed.options.update_on_start = subprogram.update;
            }

            if ( subprogram.watch ) {
                parsed.options.watch.on = subprogram.watch;
            }

        } );

    program
        .command( 'update' )
        .description( 'run the update process for this project')
        .action( function( subprogram ) {
            parsed.command = subprogram._name;
        });

    program
        .command( 'stop [script]' )
        .description( 'stop a running script' )
        .action( function( script, subprogram ) {
            parsed.command = subprogram._name;
            if ( script ) {
                parsed.app = script;
            }
        });

    program.parse( args );

    if ( program.config ) {
        parsed.options.app_cfg_file = program.config;
    }

    return parsed;
};