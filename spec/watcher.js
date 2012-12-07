var assert = require( "should" ),
    postal = require( "postal" ),
    path = require( "path" ),
    fs = require( "fs" ),
    sinon = require( "sinon" ),
    root_dir = path.resolve( __dirname + "../../" ),
    lib_dir = root_dir + "/lib",
    test_dir = root_dir + "/spec",
    logger = require( lib_dir + "/logger.js" ).silence(),
    wt = require( "fs-watch-tree" ),
    watcher = require( lib_dir + "/watcher.js" );

require( lib_dir + "/mixins.js" );

describe( "Watcher", function() {

    var app = {
        directory: "/some/directory/path",
        config: {
            watch: {
                exclude: ['folder1', 'folder2']
            }
        }
    };

    describe( "init", function() {

        it( 'should merge exclude options and set up instance vars', function() {
            
            watcher.init( app );

            watcher.options.should.eql({ exclude: ["folder1", "folder2"]});
            watcher.directory.should.equal( "/some/directory/path" );

        });

        it( 'should set use the path config to set the watch directory if present', function() {
            var mock_app = {
                directory: "/some/directory/path",
                config: {
                    watch: {
                        path: "/watchfolder"
                    }
                }
            };

            watcher.init( mock_app );

            watcher.directory.should.equal( "/some/directory/path/watchfolder" );
        });

        it( 'should turn itself off during updates', function() {
            watcher.start = sinon.stub( watcher, "start" );
            watcher.stop = sinon.stub( watcher, "stop" );
            postal.channel = sinon.stub( postal, 'channel' ).returns( postal );
            postal.subscribe = sinon.stub( postal, 'subscribe' ).returns( postal );

            watcher.init( app );

            watcher.stop.called.should.be.false;
            watcher.start.called.should.be.false;

            var c_args1 = postal.channel.getCall(0).args,
                c_args2 = postal.channel.getCall(1).args;

            c_args1.should.eql(['forge', 'update.start']);
            c_args2.should.eql(['forge', 'update.end']);

            var update_start_cb = postal.subscribe.getCall( 0 ).args[0],
                update_end_cb = postal.subscribe.getCall( 1 ).args[0];

            update_start_cb();
            watcher.stop.called.should.be.true;

            update_end_cb();
            watcher.start.called.should.be.true;

            watcher.start.restore();
            watcher.stop.restore();
            postal.channel.restore();
            postal.subscribe.restore();

        });

        describe( "start", function() {
            it( 'should start the file watcher with the appropriate arguments', function() {
                wt.watchTree = sinon.stub( wt, "watchTree" );
                postal.channel = sinon.stub( postal, 'channel' ).returns( postal );
                postal.publish = sinon.stub( postal, 'publish' ).returns( postal );

                watcher.init( app ).start();
                wt.watchTree.called.should.be.true;

                var args = wt.watchTree.args[0];
                args[0].should.equal( "/some/directory/path" );
                args[1].should.eql( { exclude: ["folder1", "folder2"] } );

                var cb = args[2];

                cb( { name: 'myfile.js' });

                postal.channel.getCall(2).args.should.eql(['application', 'signal.restart']);

                postal.channel.restore();
                postal.publish.restore();
                wt.watchTree.restore();

            });
        });

        describe( "stop", function() {
            it( 'should call the watcher stop method', function() {
                var watcher_stub = {};
                watcher_stub.end = sinon.spy();

                wt.watchTree = sinon.stub( wt, "watchTree" ).returns( watcher_stub );

                watcher.init( app ).start();

                watcher.stop();

                watcher_stub.end.called.should.be.true;

                wt.watchTree.restore();
            });
        });

    });

});