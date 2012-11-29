var assert = require( "should" ),
    postal = require( "postal" ),
    sinon = require( "sinon" ),
    amqp = require( "amqp" ),
    path = require( "path" ),
    root_dir = path.resolve( __dirname + "../../../../" ),
    lib_dir = root_dir + "/lib",
    test_dir = root_dir + "/test",
    cfg = require( lib_dir + "/config.js"),
    factory = require( lib_dir + "/application.js" ),
    runner = require( lib_dir + "/runner.js" );

describe( 'Runner', function() {

    var parent_process = {},
        app,
        config = cfg.init( root_dir + "/config.json" ),
        args = {
            app_args: ["arg1", "arg2"]
        },
        options = {
            cwd: test_dir + "/fixtures/app1"
        },
        createApp = function(type) {
            type = type || 'long';
            var app_file = (type == 'long') ? "long_process.js" : "short_process.js";

            args.app = app_file;

            return factory.create( args, config, options );
        };

    process.on('exit', function() {
        if ( app ) {
            app.stop();
        }
    });

    beforeEach( function( done ) {
        app = createApp( 'long' );
        parent_process.on = sinon.stub();
        done();
    });

    afterEach( function( done ) {
        if ( app ) {
            app.stop();
        }

        done();
    });

    describe( 'run', function() {

        it( 'should stop the child process on the parent process exit', function() {
            var app_stub = sinon.stub( app );
            runner.rabbitConnect = sinon.stub( runner, 'rabbitConnect' );
            runner.attachEvents = sinon.stub( runner, 'attachEvents' );

            runner.run( app_stub, parent_process );

            parent_process.on.called.should.be.true;
            parent_process.on.args[0][0].should.equal( 'exit' );
            
            var cb = parent_process.on.args[0][1];
            cb();
            app_stub.stop.called.should.be.true;

            runner.rabbitConnect.restore();
            runner.attachEvents.restore();

        });

        it( 'should set up the RabbitMQ connection and attach the control event listeners', function() {
            var app_stub = sinon.stub( app );
            runner.rabbitConnect = sinon.stub( runner, 'rabbitConnect' );
            runner.attachEvents = sinon.stub( runner, 'attachEvents' );

            runner.run( app_stub, parent_process );

            runner.rabbitConnect.called.should.be.true;
            runner.attachEvents.called.should.be.true;

            runner.rabbitConnect.restore();
            runner.attachEvents.restore();

        });

        it( 'should start the child process', function() {
            var app_stub = sinon.stub( app );
            runner.rabbitConnect = sinon.stub( runner, 'rabbitConnect' );
            runner.attachEvents = sinon.stub( runner, 'attachEvents' );

            runner.run( app_stub, parent_process );

            app_stub.run.called.should.be.true;

            runner.rabbitConnect.restore();
            runner.attachEvents.restore();
        });

    });

    describe( 'attachEvents', function() {
        it( 'should set up a listener that updates the application when a message is received', function() {
            var app_stub = sinon.stub( app ),
                channel_args,
                subscribe_args,
                cb;

            postal.channel = sinon.stub( postal, 'channel' ).returns( postal );
            postal.subscribe = sinon.stub( postal, 'subscribe' ).returns( postal );

            runner.attachEvents( app_stub );

            channel_args = postal.channel.args[0];
            subscribe_args = postal.subscribe.args[0];

            channel_args[0].should.equal( "application" );
            channel_args[1].should.equal( "signal.update" );

            cb = subscribe_args[0];

            cb({});

            app.update.called.should.be.true;

            postal.channel.restore();
            postal.subscribe.restore();
        });
    });

    describe( 'rabbitConnect', function() {
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
                app_stub = sinon.stub( app ),
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

            amqp.createConnection = sinon.stub( amqp, 'createConnection' ).returns( conn );

            postal.channel = sinon.stub( postal, 'channel' ).returns( postal );
            postal.publish = sinon.stub( postal, 'publish' ).returns( postal );

            runner.rabbitConnect( settings );

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

            channel_args = postal.channel.args[0];
            publish_args = postal.publish.args[0];

            channel_args[0].should.equal( "application" );
            channel_args[1].should.equal( "signal.update" );

            publish_args[0].should.eql( msg );

            postal.channel.restore();
            postal.publish.restore();
            amqp.createConnection.restore();
        });
    });

});