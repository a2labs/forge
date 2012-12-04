var should = require( "should" ),
    path = require( "path" ),
    root_dir = path.resolve( __dirname + "../../" ),
    lib_dir = root_dir + "/lib",
    test_dir = root_dir + "/spec";

describe( 'args', function() {

    var args;

    describe( 'parse()', function() {

        it( 'should return forge\'s flag along with the application\'s name and arguments', function() {

            var commander_path = require.resolve("commander"),
                args_path = lib_dir + "/args.js";

            var args1 = require( args_path ),
                command1 = ["node", "forge", "run", "--daemon", "somefile.js somefile_arg1 --somefile_flag -v"],
                parsed1 = args1.parse( command1 );

                delete require.cache[commander_path];
                delete require.cache[args_path];

            var args2 = require( args_path ),
                command2 = ["node", "forge", "run", "somefile.js"],
                parsed2 = args2.parse( command2 );

                delete require.cache[commander_path];
                delete require.cache[args_path];

            var args3 = require( args_path ),
                command3 = ["node", "forge", "run", "somefile.js --testflag"],
                parsed3 = args3.parse( command3 );

                delete require.cache[commander_path];
                delete require.cache[args_path];

                parsed1.app.should.equal( 'somefile.js' );
                parsed1.options.daemon.should.be.true;
                parsed1.app_options.should.eql( ["somefile_arg1", "--somefile_flag", "-v"] );
                parsed1.command.should.equal( 'run' );

                parsed2.app.should.equal( 'somefile.js' );
                parsed2.options.should.eql({});
                parsed2.app_options.should.be.empty;
                parsed2.command.should.equal( 'run' );

                parsed3.app.should.equal( 'somefile.js' );
                parsed3.options.should.eql({});
                parsed3.app_options.should.eql(["--testflag"]);
                parsed3.command.should.equal( 'run' );

        } );

    });

});