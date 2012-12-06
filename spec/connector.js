var assert = require( "should" ),
    postal = require( "postal" ),
    path = require( "path" ),
    sinon = require( "sinon" ),
    amqp = require( "amqp" ),
    fs = require( "fs" ),
    http = require( "http" ),
    root_dir = path.resolve( __dirname + "../../" ),
    lib_dir = root_dir + "/lib",
    test_dir = root_dir + "/spec",
    logger = require( lib_dir + "/logger.js" ).silence(),
    connector = require( lib_dir + "/connector.js" );

describe( "Connector", function() {

    describe( 'init', function() {

        it( 'should call the correct connector method', function() {
            var app = {
                config: {
                    rabbitmq: {
                        host: 'somehost'
                    }
                }
            };

            connector.rabbit = sinon.stub( connector, 'rabbit' );
            connector.http = sinon.stub( connector, 'http' );

            connector.init( app );

            connector.rabbit.called.should.be.true;
            connector.http.called.should.be.false;

            connector.rabbit.reset();
            connector.http.reset();

            app = {
                config: {
                    http: {
                        port: '9999'
                    }
                }
            };

            connector.init( app );

            connector.rabbit.called.should.be.false;
            connector.http.called.should.be.true;

            connector.rabbit.restore();
            connector.http.restore();
        });

    });

    describe( 'rabbit', function() {
        it( 'should create an amqp connection and publish messages to application channel', function() {
            var settings = {
                    "connection": {
                        "host": "rabbit.domain.com",
                        "login": "rabbituser",
                        "password": "rabbitpass",
                        "vhost": "rabbitvhost"
                    },
                    "queue": "rabbit.queue",
                    "exchange": "rabbit.exchange",
                    "key": "rabbit.routing.key"
                },
                msg = { data: "here is some data" },
                conn = {},
                queue = {},
                conn_args,
                queue_args,
                channel_args,
                subscribe_args,
                ready_cb,
                sub_cb,
                queue_cb,
                publish_args;


            conn.on = sinon.stub();
            conn.queue = sinon.stub().returns( queue );

            queue.bind = sinon.stub();
            queue.subscribe = sinon.stub();

            connector.onReceive = sinon.stub( connector, 'onReceive' );
            amqp.createConnection = sinon.stub( amqp, 'createConnection' ).returns( conn );

            connector.rabbit( settings );

            amqp.createConnection.args[0][0].should.eql( settings.connection );

            conn_args = conn.on.args[0];

            conn_args[0].should.equal( 'ready' );
            ready_cb = conn_args[1];

            ready_cb();

            conn.queue.called.should.be.true;
            queue_args = conn.queue.args[0];
            queue_args[0].should.eql( settings.queue );
            queue_cb = queue_args[1];

            queue_cb( queue );

            queue.bind.called.should.be.true;
            queue.bind.args[0][0].should.equal( settings.exchange );
            queue.bind.args[0][1].should.equal( settings.key );

            queue.subscribe.called.should.be.true;
            sub_cb = queue.subscribe.args[0][0];

            sub_cb( msg );

            connector.onReceive.getCall(0).args[0].should.eql( msg );

            amqp.createConnection.restore();
            connector.onReceive.restore();
        });
    });

    describe( "http", function() {

        it( 'should set up an http server to listen for pushes', function( done ) {
            this.timeout( 5000 );
            var settings = {
                    port: 9898,
                    key: "appendto.gatekeeper.master"
                },
                request_options = {
                    method: "POST",
                    port: 9898,
                    host: "localhost"
                };

            connector.onReceive = sinon.stub( connector, 'onReceive' );
            connector.http( settings );

            var req = http.request( request_options, function( res ) {
                    res.statusCode.should.equal( 200 );
                    connector.onReceive.called.should.be.true;
                    connector.onReceive.restore();
                    done();
                } ),
                payload = "payload=" + ( fs.readFileSync( test_dir + "/fixtures/github_payload.json" ) );

            req.write( payload );
            req.end();

        });

        it( 'should ignore requests about other repos', function( done ) {
            this.timeout( 5000 );
            var settings = {
                    port: 9899,
                    key: "appendto.gatekeeper.master"
                },
                request_options = {
                    method: "POST",
                    port: 9899,
                    host: "localhost"
                };

            connector.onReceive = sinon.stub( connector, 'onReceive' );
            connector.http( settings );

            var req = http.request( request_options, function( res ) {
                    res.statusCode.should.equal( 200 );
                    connector.onReceive.called.should.be.false;
                    connector.onReceive.restore();
                    done();
                } ),
                payload = JSON.parse ( fs.readFileSync( test_dir + "/fixtures/github_payload.json" ) );

            payload.ref = payload.ref + "somethingelse";

            payload = "payload=" + ( JSON.stringify( payload ) );

            req.write( payload );
            req.end();

        });

    });

    describe( "onReceive", function() {

        it( 'should send the application update signal', function() {

            postal.channel = sinon.stub( postal, 'channel' ).returns( postal );
            postal.publish = sinon.stub( postal, 'publish' ).returns( postal );

            var msg = { data: 'somedata' };

            connector.onReceive( msg );

            var channel_args = postal.channel.args[0],
                publish_args = postal.publish.args[0];

            channel_args[0].should.equal( "application" );
            channel_args[1].should.equal( "signal.update" );

            publish_args[0].should.eql( msg );

            postal.channel.restore();
            postal.publish.restore();
        });

    });

});