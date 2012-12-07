var should = require( "should" ),
    postal = require( "postal" ),
    sinon = require( "sinon" ),
    path = require( "path" ),
    cp = require( "child_process" )
    root_dir = path.resolve( __dirname + "../../" ),
    lib_dir = root_dir + "/lib",
    test_dir = root_dir + "/spec",
    logger = require( lib_dir + "/logger.js" ).silence(),
    cfg = require( lib_dir + "/config.js"),
    factory = require( lib_dir + "/application.js" ),
    update = require( lib_dir + "/update.js" );

require( lib_dir + "/mixins.js" );

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
            app.config.daemon.on.should.be.false;
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

        it( 'should spawn a new process', function(done) {
            this.timeout(5000);

            should.not.exist( app.child.process );
            should.not.exist( app.child.data );

            app.start();

            setTimeout(function() {
                should.exist( app.child.process );
                should.exist( app.child.data );
                app.stop();

                // Hooray for nested timeouts
                setTimeout(function() {
                    done();
                }, 1000);

            }, 1000 );

        } );

    });

    describe( 'stop', function() {

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
        it( 'should call stop() and pass a true value to restart the app', function( done ) {
            this.timeout(5000);


            app.start();

            app.stop = sinon.stub( app, "stop" );

            setTimeout( function() {
                app.restart();
                app.stop.called.should.be.true;
                app.stop.args[0][0].should.be.true;

                app.stop.restore();

                app.stop();

                setTimeout( function() {
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