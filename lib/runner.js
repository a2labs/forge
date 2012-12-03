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
    amqp = require( "amqp" ),
    _ = require( "underscore" ),
    cp = require( "child_process" ),
    fs = require( "fs" ),
    crypto = require( "crypto" ),
    psTree = require( "ps-tree" ),
    runner = {

        attachEvents: function( app ) {
            postal.channel( "application", "signal.update" ).subscribe( function( msg ) {
                app.update( function() {
                    app.restart();
                });
            } );
        },

        rabbitConnect: function( settings ) {
            var conn = amqp.createConnection( settings.connection );
            conn.on('ready', function() {

                conn.queue( settings.queue, function(queue) {

                    queue.bind(settings.exchange, settings.key );
                    postal.channel( "forge", "log.output" ).publish( {data: "[forge] RabbitMQ connection bound to " + settings.key } );
                    queue.subscribe( function( message ) {
                        postal.channel( "application", "signal.update" ).publish( message );
                    });

                });

            });
        },

        run: function( app, parent_process, daemon_mode ) {
            if ( daemon_mode ) {
                runner.startDaemon( app, parent_process );
            } else {
                runner.startMonitor( app, parent_process );
            }
        },

        startDaemon: function( app, parent_process ) {
            // Spawn an instance of forged and remove daemon flag
            var out = fs.openSync( app.config.stdout_log, 'a' ),
                err = fs.openSync( app.config.stderr_log, 'a' ),
                new_args = _.without( parent_process.argv, "--daemon" ),
                executable = new_args[1].split( "/" ),
                last = executable.length - 1;
            
            executable[ last ] = "forged";
            new_args[1] = executable.join( "/" );
            
            postal.channel( "forge", "log.output" ).publish( { data: "[forge] Starting forge in daemon mode" } );
            var child = cp.spawn(new_args[0], new_args.slice( 1 ), {
                detached: true,
                stdio: [ 'ignore', out, err ]
            });

            child.unref();

            runner.savePid( child.pid, app );
        },

        startMonitor: function( app, parent_process ) {
            parent_process.on('exit', function() {
                app.stop();
            });

            if ( app.config.rabbitmq ) {
                runner.rabbitConnect( app.config.rabbitmq );
            }
            runner.attachEvents( app );

            if ( app.config.update ) {
                app.update( true );
            } else {
                app.start();
            }
        },

        getPidFile: function( app ) {
            var hash = crypto.createHash( "md5" );
                hash.update( app.executable );

            var filename = hash.digest( "hex" ) + ".pid",
                pid_path = app.config.pid_dir + "/" + filename;

            return pid_path;
        },

        savePid: function( pid, app ) {
            var file = runner.getPidFile( app );

            fs.writeFile( file, pid, 'utf-8', function(err) {
                if ( err ) {
                    postal.channel( "forge", "log.error" ).publish( {data: "Could not save PID file" } );
                }
            });
            

        },

        stop: function( app, parent_process, psTree_cmd ) {
            psTree_cmd = psTree_cmd || psTree;
            var file = runner.getPidFile( app );

            if ( fs.existsSync( file ) ) {
                var pid = parseInt( fs.readFileSync( file, 'utf-8' ), 10 );
                
                psTree_cmd( pid, function( err, children ) {
                    parent_process.kill( pid );
                    cp.spawn('kill', ['-9'].concat(children.map(function (p) {return p.PID; } ) ) );
                });
                fs.unlink( file );
            }

        },

        update: function( app, parent_process ) {
            app.update();
        }

    };

module.exports = runner;