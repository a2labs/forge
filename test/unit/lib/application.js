var should = require( "should" ),
    postal = require( "postal" ),
    sinon = require( "sinon" ),
    path = require( "path" ),
    cp = require( "child_process" ),
    root_dir = path.resolve( __dirname + "../../../../" ),
    lib_dir = root_dir + "/lib",
    test_dir = root_dir + "/test",
    cfg = require( lib_dir + "/config.js"),
    factory = require( lib_dir + "/application.js" );



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
            app.process_args.should.eql([test_dir + "/fixtures/app1/long_process.js", "arg1", "arg2"]);
        } );

        it( 'should add the application specific config from forge.json', function() {
            app.config.daemon.should.be.false;
            app.config.sometestkey.should.equal( "sometestval" );
        });

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
            this.timeout(5000);

            var start_count = 0,
                restart_count = 0;

            postal.channel( "forge", "start").subscribe( function( msg) {
                start_count++;
            });

            postal.channel( "forge", "restart").subscribe( function( msg) {
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

        it( 'should pull the latest content from a git repository, run an update script, and restart the app', function() {
            var exec_args,
                exec_args2,
                git_cb,
                update_cb;

            postal.channel = sinon.stub( postal, 'channel' ).returns( postal );
            postal.publish = sinon.stub( postal, 'publish' );
            cp.exec = sinon.stub( cp, 'exec' );
            app.restart = sinon.stub( app, 'restart' );

            app.update();

            cp.exec.called.should.be.true;
            exec_args = cp.exec.args[0];

            exec_args[0].should.equal( "git reset --hard master && git pull origin master && npm install" );
            exec_args[1].should.eql( { cwd: app.directory } );
            git_cb = exec_args[2];

            git_cb( '', 'someoutput' );
            // Can test for postal messages if we want to.
             
            exec_args2 = cp.exec.getCall(1).args;
            exec_args2[0].should.equal( "npm install && ./update.js" );
            exec_args2[1].should.eql( { cwd: app.directory } );
            update_cb = exec_args2[2];

            update_cb();

            app.restart.called.should.be.true;

            postal.channel.restore();
            postal.publish.restore();
            cp.exec.restore();
            app.restart.restore();
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