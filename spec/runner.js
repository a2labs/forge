var assert = require( "should" ),
    postal = require( "postal" ),
    amqp = require( "amqp" ),
    path = require( "path" ),
    fs = require( "fs" ),
    cp = require( "child_process" ),
    sinon = require( "sinon" ),
    root_dir = path.resolve( __dirname + "../../" ),
    lib_dir = root_dir + "/lib",
    test_dir = root_dir + "/spec",
    cfg = require( lib_dir + "/config.js"),
    logger = require( lib_dir + "/logger.js" ).silence(),
    factory = require( lib_dir + "/application.js" ),
    connector = require( lib_dir + "/connector.js" ),
    watcher = require( lib_dir + "/watcher.js" ),
    runner = require( lib_dir + "/runner.js" );

require( lib_dir + "/mixins.js" );

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
        app.config.daemon = {
            pid_dir: "/var/tmp",
            stdout_log: "./out.log",
            stderr_log: "./out.log"
        };
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

        it( 'should delegate to the correct start method based on the daemon parameter', function() {
            runner.startDaemon = sinon.stub( runner, 'startDaemon' );
            runner.startMonitor = sinon.stub( runner, 'startMonitor' );
            connector.init = sinon.stub( connector, 'init' );

            var mock_app = {
                config: {
                    connections: {
                        on: true
                    },
                    watch: {}
                }
            };

            runner.run( mock_app, null, true );
            runner.startDaemon.called.should.be.true;
            runner.startMonitor.called.should.be.false;
            connector.init.called.should.be.false;

            connector.init.reset();
            runner.startDaemon.reset();
            runner.startMonitor.reset();            

            runner.run( mock_app, null, false );
            runner.startDaemon.called.should.be.false;
            runner.startMonitor.called.should.be.true;

            connector.init.called.should.be.true;
            connector.init.args[0][0].should.eql( mock_app );

            connector.init.restore();
            runner.startDaemon.restore();
            runner.startMonitor.restore();
        });

        it( 'should start the file watcher if it is enabled in the config', function() {
            runner.startMonitor = sinon.stub( runner, 'startMonitor' );
            watcher.start = sinon.stub( watcher, "start" );
            watcher.init = sinon.stub( watcher, "init" ).returns( watcher );

            var mock_app = {
                config: {
                    connections: {
                        on: false
                    },
                    watch: {
                        on: true
                    }
                }
            };

            runner.run( mock_app, null, false );

            watcher.init.args[0][0].should.eql( mock_app );
            watcher.start.called.should.be.true;

            watcher.start.restore();
            watcher.init.restore();
            runner.startMonitor.restore();
        });

    });

    describe( 'startMonitor', function() {

        it( 'should stop the child process on the parent process exit', function() {
            var app_stub = sinon.stub( app );
            runner.attachEvents = sinon.stub( runner, 'attachEvents' );

            runner.startMonitor( app_stub, parent_process );

            parent_process.on.called.should.be.true;
            parent_process.on.args[0][0].should.equal( 'exit' );
            
            var cb = parent_process.on.args[0][1];
            cb();
            app_stub.stop.called.should.be.true;

            
            runner.attachEvents.restore();

        });

        it( 'should start the child process', function() {
            var app_stub = sinon.stub( app );
            runner.attachEvents = sinon.stub( runner, 'attachEvents' );

            runner.startMonitor( app_stub, parent_process );

            app_stub.start.called.should.be.true;

            runner.attachEvents.restore();
        });

        it( 'should attempt an update before starting if specified in config', function() {
            app.update = sinon.stub( app, "update" ).callsArg( 0 );
            app.start = sinon.stub( app, "start" );

            var update_on_start = app.config.update_on_start;
            app.config.update_on_start = true;

            runner.attachEvents = sinon.stub( runner, 'attachEvents' );

            runner.startMonitor( app, parent_process );

            app.update.called.should.be.true;
            app.start.called.should.be.true;

            app.start.restore();
            app.update.restore();
            app.config.update_on_start = update_on_start;

            runner.attachEvents.restore();
        });
    });

    describe( 'startDaemon', function() {

        it( 'should spawn a new process in daemon mode', function() {

            var child = {};
            child.pid = 1111;
            child.unref = sinon.stub();

            cp.spawn = sinon.stub( cp, 'spawn' ).returns( child );
            fs.openSync = sinon.stub( fs, 'openSync' ).returns( 'ignore' );

            runner.savePid = sinon.stub( runner, 'savePid' );

            var parent = {
                argv: [ 'node','/Users/brian/nvm/v0.8.14/bin/forge','run','--daemon','server.js' ]
            },
            spawn_args;

            runner.startDaemon(app, parent);

            cp.spawn.called.should.be.true;
            spawn_args = cp.spawn.args[0];

            spawn_args[0].should.equal( 'node' );
            spawn_args[1].should.eql( ['/Users/brian/nvm/v0.8.14/bin/forged','run', 'server.js'] );
            spawn_args[2].should.eql( {
                detached: true,
                stdio: [ 'ignore', 'ignore', 'ignore' ]
            } );

            child.unref.called.should.be.true;
            runner.savePid.args[0][0].should.equal( 1111 );
            runner.savePid.args[0][1].should.eql( app );

            cp.spawn.restore();
            runner.savePid.restore();
            fs.openSync.restore();
        });

    });

    describe( 'getPidFile', function() {
        it( 'should returned the path to the pid file for the current process', function() {

            app.executable = "sometestfile.js";

            var path = runner.getPidFile( app );
            path.should.equal("/var/tmp/5a45decb9032868fabceb1adb08630ed.pid");
        });
    });

    describe( 'savePid', function() {
        it( 'should save a single pid to a file', function() {
            fs.writeFile = sinon.stub( fs, 'writeFile' );

            app.config.daemon.pid_dir = "/var/tmp";
            app.executable = "sometestfile.js";

            runner.savePid( '1111', app );
            var args = fs.writeFile.args[0];

            args[0].should.equal( "/var/tmp/5a45decb9032868fabceb1adb08630ed.pid" );
            args[1].should.equal( '1111' );

            fs.writeFile.restore();

        });
    });

    describe( 'stop', function() {
        it( 'should retrieve the pid from a file and then kill the monitor and child processes', function() {
            var parent_process = {},
                psTree_cmd = sinon.stub(),
                kill_cb;

            parent_process.kill = sinon.stub();


            cp.spawn = sinon.stub( cp, 'spawn' );
            fs.existsSync = sinon.stub( fs, 'writeFileSync' ).returns( true );
            fs.readFileSync = sinon.stub( fs, 'readFileSync' ).returns( '1111' );

            app.config.daemon.pid_dir = "/var/tmp";
            app.executable = "sometestfile.js";

            runner.stop( app, parent_process, psTree_cmd );

            fs.existsSync.args[0][0].should.equal( "/var/tmp/5a45decb9032868fabceb1adb08630ed.pid" );

            psTree_cmd.args[0][0].should.equal( 1111 );
            kill_cb = psTree_cmd.args[0][1];

            kill_cb( '', [
                { PID: '1112' },
                { PID: '1113' }
            ]);

            parent_process.kill.args[0][0].should.equal( 1111 );
            cp.spawn.args[0][0].should.equal( 'kill' );
            cp.spawn.args[0][1].should.eql( [ '-9', '1112', '1113' ] );

            fs.existsSync.restore();
            fs.readFileSync.restore();
            cp.spawn.restore();
        });
    });

    describe( 'update', function() {
        it( 'should call the application\'s update method', function() {
            var test_app = {};
            test_app.update = sinon.spy();

            runner.update( test_app );
            test_app.update.called.should.be.true;
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

            channel_args = postal.channel.getCall(0).args;
            subscribe_args = postal.subscribe.getCall(0).args;

            channel_args[0].should.equal( "application" );
            channel_args[1].should.equal( "signal.update" );

            cb = subscribe_args[0];

            cb({});

            app.update.called.should.be.true;

            channel_args = postal.channel.getCall(1).args;
            subscribe_args = postal.subscribe.getCall(1).args;

            channel_args[0].should.equal( "application" );
            channel_args[1].should.equal( "signal.restart" );

            cb = subscribe_args[0];

            cb({});

            app.restart.called.should.be.true;

            postal.channel.restore();
            postal.subscribe.restore();
        });
    });

    

});