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
    amqp = require( "amqp" );

exports.attachEvents = function( app ) {

    postal.channel( "application", "signal.update" ).subscribe( function( msg ) {
        app.update();
    } );

};

exports.rabbitConnect = function( settings ) {
    var conn = amqp.createConnection( settings.connection );
    conn.on('ready', function() {

        conn.queue( settings.queue, function(queue) {

            queue.bind(settings.exchange, settings.key );

            queue.subscribe( function( message ) {
                postal.channel( "application", "signal.update" ).publish( message );
            });

        });

    });
};

exports.go = function( app, parent_process ) {
    
    parent_process.on('exit', function() {
        app.stop();
    });

    if ( app.config.rabbitmq ) {
        exports.rabbitConnect( app.config.rabbitmq );
    }
    exports.attachEvents( app );

    app.start();

};
