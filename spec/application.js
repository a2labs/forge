var should = require( "should" ),
    postal = require( "postal" ),
    sinon = require( "sinon" ),
    path = require( "path" ),
    cp = require( "child_process" ),
    root_dir = path.resolve( __dirname + "../../" ),
    lib_dir = root_dir + "/lib",
    test_dir = root_dir + "/spec",
    cfg = require( lib_dir + "/config.js"),
    factory = require( lib_dir + "/application.js" ),
    update = require( lib_dir + "/update.js" );



describe( 'Application', function() {

    var app,
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
        done();
    });

    afterEach( function( done ) {
        if ( app && app.child.process && app.child.process.running ) {
            this.timeout(5000);
            app.stop();
            setTimeout(done, 2000);
        } else {
            done();
        }

    });

    describe( 'constructor', function() {

        it( 'should set up instance variables', function() {
            app.should.be.a( 'object' );
            app.config.should.eql( config );
            app.options.should.eql( options );
            app.args.should.eql( args );

            app.executable.should.equal( test_dir + "/fixtures/app1/long_process.js" );
            app.directory.should.equal( test_dir + "/fixtures/app1" );

        } );

        it( 'should add the application specific config from forge.json', function() {
            app.config.daemon.should.be.false;
            app.config.sometestkey.should.equal( "sometestval" );
        });

        it( 'should derive the executable from the config file if it is not specified', function() {

            var args = {},
                options = { cwd: test_dir + "/fixtures/app2" },
                new_app = factory.create( args, config, options );

            new_app.executable.should.equal( test_dir + "/fixtures/app2/app.js" );
        });

    });

    describe( 'start', function() {

        it( 'should spawn a new process with attached messaging', function(done) {
            this.timeout(5000);

            var start_count = 0,
                exit_count = 0,
                out_count = 0,
                err_count = 0;

            postal.channel("forge", "log.start").subscribe( function(msg) {
                start_count++;
            });

            postal.channel("forge", "log.exit").subscribe( function(msg) {
                exit_count++;
            });

            postal.channel("application", "log.output").subscribe( function(msg) {
                out_count++;
            });

            postal.channel("application", "log.error").subscribe( function(msg) {
                err_count++;
            });

            app.start();

            setTimeout(function() {
                exit_count.should.equal( 0 );
                app.stop();

                // Hooray for nested timeouts
                setTimeout(function() {
                    start_count.should.equal( 1 );
                    exit_count.should.equal( 1 );
                    err_count.should.equal( 0 );
                    out_count.should.be.above( 0 );
                    done();
                }, 1000);

            }, 1000 );

        } );

    });

    describe( 'stop', function() {
        it( 'should kill the currently running child process', function(done) {
            this.timeout(5000);

            var forge_exit = 0,
                app_exit = 0;

            postal.channel( "forge", "log.exit").subscribe( function( msg) {
                forge_exit++;
            });

            postal.channel( "application", "log.exit").subscribe( function( msg ) {
                app_exit++;
            });

            app.start();

            setTimeout(function() {
                forge_exit.should.equal( 0 );
                app_exit.should.equal( 0 );
                app.stop();

                setTimeout(function() {
                    forge_exit.should.equal( 1 );
                    app_exit.should.equal( 1 );
                    done();
                }, 1000);
            }, 1000);
        });

        it( 'should execute a callback and force a restart if specified', function( done ) {
            this.timeout(5000);

            app.start();

            app.start = sinon.stub( app, 'start' );
            app.reset = sinon.stub( app, 'reset' );
            var cb = sinon.spy();

            setTimeout(function() {
                app.stop( true, cb );

                setTimeout(function() {
                    cb.called.should.be.true;
                    app.start.called.should.be.true;
                    app.reset.called.should.be.true;
                    app.start.restore();
                    app.reset.restore();
                    done();
                }, 1000);

            }, 1000 );
        });
    });

    describe( 'restart', function() {
        it( 'should call stop() and start() in sequence', function( done ) {
            this.timeout(5000);

            var start_count = 0,
                restart_count = 0;

            postal.channel( "forge", "log.start").subscribe( function( msg) {
                start_count++;
            });

            postal.channel( "forge", "log.restart").subscribe( function( msg) {
                restart_count++;
            });

            app.start();

            setTimeout( function() {
                app.restart();
                setTimeout( function() {
                    app.stop();
                    restart_count.should.equal( 1 );
                    start_count.should.equal( 2 );
                    done();
                }, 1000 );
            }, 1000 );
        });
    });

    describe( 'update', function() {

        it( 'should try a safe update and forward itself and a callback', function() {
            var cb = sinon.spy();
            update.safe = sinon.stub( update, 'safe' );

            app.update( cb );

            update.safe.called.should.be.true;
            update.safe.args[0][0].should.eql( app );
            update.safe.args[0][1].should.eql( cb );

            update.safe.restore();

        } );

    });

    describe( 'reset', function() {

        it( 'should set the child instance varible properties to null', function() {

            app.child.process = 'someval1';
            app.child.data = 'someval2';

            app.reset();
            
            should.not.exist(app.child.process);
            should.not.exist(app.child.data);
        });

    });

});