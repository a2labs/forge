var should = require( "should" ),
    postal = require( "postal" ),
    sinon = require( "sinon" ),
    path = require( "path" ),
    cp = require( "child_process" ),
    root_dir = path.resolve( __dirname + "../../" ),
    lib_dir = root_dir + "/lib",
    update = require( lib_dir + "/update.js" );

require( lib_dir + "/mixins.js" );

describe( "Update", function() {

    var options = { cwd: root_dir };

    describe( "getCurrentRevision", function() {

        it( "should return the current git sha", function() {
            var cb = sinon.spy();
            cp.exec = sinon.stub( cp, "exec" );

            update.getCurrentRevision( options, cb );

            var args = cp.exec.getCall(0).args;

            args[0].should.equal( "git rev-parse HEAD" );
            args[1].should.eql( options );
            var done = args[2];

            done( '', '6194501309d1e88c3aba9f3d2ad89025b70181a6' );

            cb.getCall(0).args[1].should.equal( '6194501309d1e88c3aba9f3d2ad89025b70181a6' );

            cp.exec.restore();

        });

    });

    describe( "gitUpdate", function() {
        it( "should perform a git pull", function() {
            var cb = sinon.spy();
            cp.exec = sinon.stub( cp, "exec" );

            update.gitUpdate( "master", "origin", options, cb );

            var args = cp.exec.getCall(0).args;

            args[0].should.equal( "git reset --hard master && git pull origin master" );
            args[1].should.eql( options );

            cp.exec.restore();

        });
    });

    describe( "gitResetRevision", function() {
        it( "should reset the repo to a certain revision", function() {
            var cb = sinon.spy();
            cp.exec = sinon.stub( cp, "exec" );

            update.gitResetRevision( "6194501309d1e88c3aba9f3d2ad89025b70181a6", options, cb );

            var args = cp.exec.getCall(0).args;

            args[0].should.equal( "git reset --hard 6194501309d1e88c3aba9f3d2ad89025b70181a6" );
            args[1].should.eql( options );

            cp.exec.restore();

        });
    });

    describe( "runPostUpdateScript", function() {
        it( "should execute a script if it's available", function() {
            var cb = sinon.spy(),
                app = {
                    config: {
                        scripts: {
                            update: "whoami"
                        }
                    }
                };
            cp.exec = sinon.stub( cp, "exec" );

            update.runPostUpdateScript( app, options, cb );

            var args = cp.exec.getCall(0).args;

            args[0].should.equal( "whoami" );
            args[1].should.eql( options );

            cp.exec.restore();

        });

        it( "should skip to the callback if no script is present", function() {
            var cb = sinon.spy(),
                app = {
                    config: {}
                };
            cp.exec = sinon.stub( cp, "exec" );

            update.runPostUpdateScript( app, options, cb );

            cb.called.should.be.true;
            cp.exec.called.should.be.false;

            cp.exec.restore();
        });
    });

    describe( "safe", function() {

        it( "should initialize the fsm and start the process", function() {

            var fsm_stub = {
                    on: sinon.spy(),
                    transition: sinon.spy()
                },
                cb = sinon.spy(),
                app = {
                    config: {}
                };
            update.fsm = sinon.stub( update, "fsm" ).returns( fsm_stub );


            update.safe( app, cb );

            update.fsm.called.should.be.true;
            fsm_stub.on.called.should.be.true;

            fsm_stub.on.args[0][0].should.equal( "success" );
            fsm_stub.on.callArg( 1 );

            cb.called.should.be.true;

            fsm_stub.transition.args[0][0].should.equal( "starting" );

            update.fsm.restore();
        });

    });

    describe( "fsm", function() {

        var app = {
                config: {
                    scripts: {
                        update: "whoami"
                    }
                },
                directory: root_dir
            },
            fsm;

        beforeEach(function( done ) {
            update.getCurrentRevision = sinon.stub( update, "getCurrentRevision" );
            update.gitUpdate = sinon.stub( update, "gitUpdate" );
            update.runPostUpdateScript = sinon.stub( update, "runPostUpdateScript" );
            update.gitResetRevision = sinon.stub( update, "gitResetRevision" );

            fsm = update.fsm( app );

            done();
        });

        afterEach(function( done ) {
            update.getCurrentRevision.restore();
            update.gitUpdate.restore();
            update.runPostUpdateScript.restore();
            update.gitResetRevision.restore();

            fsm = null;

            done();
        });

        describe( 'constructor', function() {
            it( "should setup a state machine", function() {

                fsm.cache.app.should.eql( app );
                fsm.cache.revision.should.eql( 'master' );
                fsm.cache.remote.should.eql( 'origin' );
                fsm.cache.cwd.should.eql( root_dir );

            });
        });

        describe( "[state] starting", function() {

            it( 'should store the current git revision sha and transition to updating', function() {

                update.getCurrentRevision.callsArgWith( 1, '', '6194501309d1e88c3aba9f3d2ad89025b70181a6' );
                fsm.transition = sinon.spy( fsm, "transition" );

                fsm.transition( "starting" );

                var args = update.getCurrentRevision.getCall( 0 ).args;

                args[ 0 ].should.eql( { cwd: root_dir });

                fsm.cache.current_revision_sha.should.equal( '6194501309d1e88c3aba9f3d2ad89025b70181a6' );

                fsm.transition.getCall( 1 ).args[0].should.equal( "updating" );
                fsm.transition.restore();
            });

        });

        describe( "[state] updating", function() {

            it( 'should do a pull and then run update scripts', function( done ) {

                update.gitUpdate.callsArgWith( 3, null );
                update.runPostUpdateScript.callsArgWith( 2, null );

                fsm.on( 'success', function() {
                    done();
                });

                fsm.transition( "updating" );

                var args1 = update.gitUpdate.getCall( 0 ).args;
                args1[0].should.equal( 'master' );
                args1[1].should.equal( 'origin' );
                args1[2].should.eql( {cwd: root_dir } );

                var args2 = update.runPostUpdateScript.getCall( 0 ).args;
                args2[0].should.eql( app );
                args2[1].should.eql( {cwd: root_dir } );

            });

            it( 'should transition to rollingback if an error is encountered', function() {
                fsm.transition = sinon.spy( fsm, "transition" );

                update.gitUpdate.callsArgWith( 3, true );
                update.runPostUpdateScript.callsArgWith( 2, null );

                fsm.transition( "updating" );

                fsm.transition.getCall( 1 ).args[0].should.equal( "rollingback" );
                update.runPostUpdateScript.called.should.be.false;

                fsm.transition.restore();

            });


        });

        describe( "[state] rollingback", function() {

            it( 'should reset the revision and then run any update scripts', function( done ) {

                update.gitResetRevision.callsArgWith( 2, null );
                update.runPostUpdateScript.callsArgWith( 2, null );

                fsm.on( 'success', function() {
                    done();
                });

                fsm.cache.current_revision_sha = '6194501309d1e88c3aba9f3d2ad89025b70181a6';
                fsm.transition( "rollingback" );

                var args1 = update.gitResetRevision.getCall( 0 ).args;
                args1[0].should.equal( '6194501309d1e88c3aba9f3d2ad89025b70181a6' );
                args1[1].should.eql( {cwd: root_dir } );

                var args2 = update.runPostUpdateScript.getCall( 0 ).args;
                args2[0].should.equal( app );
                args2[1].should.eql( {cwd: root_dir });

            });

        });
    });

});