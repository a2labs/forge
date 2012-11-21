var assert = require( "should" ),
    postal = require( "postal" ),
    sinon = require( "sinon" ),
    cfg = require( "../../../lib/config.js"),
    factory = require( "../../../lib/application.js" );

describe( 'Application', function() {

    var app,
        config = cfg.init(),
        args = {
            app_args: ["arg1", "arg2"]
        },
        options = {
            cwd: "../../fixtures/app1"
        },
        createApp = function(type) {
            type = type || 'long';
            var app_file = (type == 'long') ? "long_process.js" : "short_process.js";

            args.app = app_file;

            return factory.create( args, config, options );
        };

    beforeEach( function( done ) {
        app = createApp( 'long' );
        process.on('exit', function() {
            app.stop();
        });
        done();
    });

    afterEach( function( done ) {
        if ( app ) {
            app.stop();
        }

        done();
    });

    describe( 'constructor', function() {

        it( 'should set up instance variables', function() {
            app.should.be.a( 'object' );
            app.config.should.eql( config );
            app.options.should.eql( options );
            app.args.should.eql( args );

            app.executable.should.equal( "../../fixtures/app1/long_process.js" );
            app.directory.should.equal( "../../fixtures/app1" );
            app.process_args.should.eql(["../../fixtures/app1/long_process.js", "arg1", "arg2"]);
        } );

    });

    describe( 'start', function() {

        it( 'should spawn a new process with attached messaging', function(done) {
            this.timeout(5000);

            var start_count = 0,
                exit_count = 0,
                out_count = 0,
                err_count = 0;

            postal.channel("forge", "start").subscribe( function(msg) {
                start_count++;
            });

            postal.channel("forge", "exit").subscribe( function(msg) {
                exit_count++;
            });

            postal.channel("application", "output").subscribe( function(msg) {
                out_count++;
            });

            postal.channel("application", "error").subscribe( function(msg) {
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

            postal.channel( "forge", "exit").subscribe( function( msg) {
                forge_exit++;
            });

            postal.channel( "application", "exit").subscribe( function( msg ) {
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
    });

    describe( 'restart', function() {
        it( 'should call stop() and start() in sequence', function( done ) {
            app.start();

            var start = sinon.stub( app, "start" ),
                stop = sinon.stub( app, "stop" ),
                restart_count = 0;

            postal.channel( "forge", "restart").subscribe( function( msg) {
                restart_count++;
            });

            setTimeout( function() {
                app.restart();
                start.called.should.be.ok;
                stop.called.should.be.ok;
                restart_count.should.equal( 1 );
                start.reset();
                stop.reset();
                done();
            }, 1000 );
        });
    });

});