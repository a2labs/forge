/*
    forge - A Node.js tool for continuous integration
    version:    0.0.1
    author:     Brian Edgerton <bedgerton@appendto.com> (http://appendto.com)
    copyright:  2012
    license:    Dual licensed
                MIT (http://www.opensource.org/licenses/mit-license)
                GPL (http://www.opensource.org/licenses/gpl-license)
*/

exports.parse = function( args ) {

    var parsed = {
        options: {},
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
        .description( 'run a script' )
        .action( function( script, subprogram ) {
            if ( script ) {
                // Check to see if this contains the app args
                var script_array = script.split( /\s+/ );
                parsed.app = script_array[0];
                if ( script_array.length > 1 ) {
                    parsed.app_options = script_array.slice( 1 );
                }
            }
            
            if ( subprogram.daemon ) {
                parsed.options.daemon = subprogram.daemon;
            }

            if ( subprogram.update ) {
                parsed.options.update = subprogram.update;
            }

        } );

    program.parse( args );

    if ( program.config ) {
        parsed.options.config = program.config;
    }

    return parsed;
};