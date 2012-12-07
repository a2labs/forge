/*
    forge - A Node.js tool for continuous integration
    version:    0.1.1
    author:     Brian Edgerton <bedgerton@appendto.com> (http://appendto.com)
    copyright:  2012
    license:    Dual licensed
                MIT (http://www.opensource.org/licenses/mit-license)
                GPL (http://www.opensource.org/licenses/gpl-license)
*/

var amqp = require( "amqp" ),
    postal = require( "postal" ),
    http = require( "http" ),
    logger = require( "./logger.js" ),
    querystring = require( "querystring" ),
    _ = require( "underscore" ),
    Connector = {
        init: function( app ) {
            var config = app.config.connections,
                useRabbit = config.rabbitmq && ( ! config.http || config.use == 'rabbitmq' ),
                useHttp = config.http && ( ! config.rabbitmq || config.use == 'http' );

            if ( useRabbit ) {
                Connector.rabbit( config.rabbitmq );
            } else if ( useHttp ) {
                Connector.http( config.http );
            }
        },

        rabbit: function( settings ) {
            var conn = amqp.createConnection( settings.connection );
            conn.on('ready', function() {

                conn.queue( settings.queue, function(queue) {

                    queue.bind(settings.exchange, settings.key );

                    logger.forge.info( "RabbitMQ connection bound to " + settings.key );

                    queue.subscribe( function( message ) {
                        logger.forge.info( "Message received: " + message );
                        Connector.onReceive( message );
                    });

                });

            });
        },

        http: function( settings ) {

            var port = settings.port || 9000,
                correctRepo = function( payload ) {
                    var split = settings.key.split( "." ),
                        owner = split[ 0 ],
                        name = split[ 1 ],
                        rev = "/" + split[ 2 ],
                        repo = payload.repository;

                    return ( repo.name == name && repo.owner.name == owner && _.str.endsWith( payload.ref, rev ) );

                };
            // Borrowed basic setup from Gith https://github.com/danheberden/gith
            var server = http.createServer( function(req, res) {
                var data = "";

                if ( req.method === "POST" ) {
                  req.on( "data", function( chunk ) {
                    data += chunk;
                  });
                }

                req.on( "end", function() {
                  if ( /^payload=/.test( data ) ) {
                    var payload = JSON.parse( querystring.unescape(data.slice(8)) );
                    if ( correctRepo( payload ) ) {
                        Connector.onReceive( payload );
                    }
                    res.writeHead( 200, {
                      'Content-type': 'text/html'
                    });
                  }
                  res.end();
                });
            }).listen( port );
            logger.forge.info( "HTTP Server listening for updates on port " + port );
        },

        onReceive: function( payload ) {
            postal.channel( "application", "signal.update" ).publish( payload );
        }
    };

module.exports = Connector;