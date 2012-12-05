/*
    forge - A Node.js tool for continuous integration
    version:    0.0.1
    author:     Brian Edgerton <bedgerton@appendto.com> (http://appendto.com)
    copyright:  2012
    license:    Dual licensed
                MIT (http://www.opensource.org/licenses/mit-license)
                GPL (http://www.opensource.org/licenses/gpl-license)
*/

var libpath = __dirname,
    path = require( "path" ),
    args = require( libpath + "/args.js" ).parse( process.argv );
    config_file = process.env['FORGE_CFG_FILE'] || path.resolve( __dirname + "/../config.json" ),
    config = require( libpath + "/config.js" ).init( config_file, args.options ),
    cwd = process.cwd(),
    app = require( libpath + "/application.js" ).create( args, config, {cwd: cwd }),
    logger = require( libpath + "/logger.js" ).configure( app.config );
    runner = require( libpath + "/runner.js" );

module.exports = function( can_daemonize ) {
    can_daemonize = can_daemonize || true;
    
    var daemon_mode = can_daemonize && app.config.daemon,
        cmd = args.command;

    if ( runner[ cmd ] ) {
        runner[ cmd ]( app, process, daemon_mode );
    }

};