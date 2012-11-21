#!/usr/bin/env node

/*
    forge - A Node.js tool for continuous integration
    version:    0.0.1
    author:     Brian Edgerton <bedgerton@appendto.com> (http://appendto.com)
    copyright:  2012
    license:    Dual licensed
                MIT (http://www.opensource.org/licenses/mit-license)
                GPL (http://www.opensource.org/licenses/gpl-license)
*/

var libpath = __dirname + "/lib",
    logger = require( libpath + "/logger.js" ),
    args = require( libpath + "/args.js" ).parse( process.argv );
    config_file = process.env['FORGE_CFG_FILE'] || __dirname + "/config.json",
    config = require( libpath + "/config.js" ).init( config_file, args.options ),
    cwd = process.cwd(),
    app = require( libpath + "/application.js" ).create( args, config, {cwd: cwd });
    

    process.on('exit', function() {
        application.stop();
    });

    app.start();
/*
var fs = require( 'fs' ),
    cp = require( 'child_process' ),
    
    processHook = function(hook) {

    },
    cfg_file = getCfgFile(process.env['GHCLIENT_CFG']),
    config = JSON.parse( fs.readFileSync( cfg_file ) ),
    amqp = require( 'amqp' ),
    conn = amqp.createConnection( config.rabbitmq );


conn.on('ready', function() {
    console.log("Connection established");
    var q = conn.queue( config.queue, function(queue) {
        console.log( "Opening " + queue.name + " queue" );

        for ( var i = 0, j = config.hooks.length; i < j; i++ ) {
            var key = routing_prefix + config.hooks[i].key;
            map[ key ] = config.hooks[ i ];
            console.log( "=> Binding queue to: " + key );
            queue.bind(config.exchange, key );
        }

        queue.subscribe(function(message) {
            var key = message._meta.routing_key,
                now = new Date().toString();
            console.log( 'Received a message for: ' + key + ' at ' + now );
            processHook( map[ key ] );
        });
    });

});
*/