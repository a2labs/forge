require( "should" );

describe( 'args', function() {

    var args;

    before( function( done ) {
        args = require( "../../../lib/args.js" );
        done();
    });

    describe( 'parse()', function() {

        it( 'should return forge\'s flag along with the application\'s name and arguments', function() {

            var command1 = ["node", "forge", "--test", "somefile.js", "somefile_arg1", "--somefile_flag", "-v"],
                parsed1 = args.parse( command1 ),

                command2 = ["node", "forge", "somefile.js"],
                parsed2 = args.parse( command2 ),

                command3 = ["node", "forge", "somefile.js", "--testflag"],
                parsed3 = args.parse( command3 );

                parsed1.app.should.equal( 'somefile.js' );
                parsed1.options['test'].should.be.true;
                parsed1.app_options.should.eql( ["somefile_arg1", "--somefile_flag", "-v"] );

                parsed2.app.should.equal( 'somefile.js' );
                parsed2.options.should.eql({});
                parsed2.app_options.should.be.empty;

                parsed3.app.should.equal( 'somefile.js' );
                parsed3.options.should.eql({});
                parsed3.app_options.should.eql(["--testflag"]);

        } );

    });

});