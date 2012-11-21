/*
    forge - A Node.js tool for continuous integration
    version:    0.0.1
    author:     Brian Edgerton <bedgerton@appendto.com> (http://appendto.com)
    copyright:  2012
    license:    Dual licensed
                MIT (http://www.opensource.org/licenses/mit-license)
                GPL (http://www.opensource.org/licenses/gpl-license)
*/

var fs = require( "fs" ),
    path = require( "path" ),
    util = require( "util" ),
    postal = require( "postal" ),
    cp = require( "child_process" ),
    spawn = cp.spawn,
    Application = function(args, config, options) {
        this.process = null;
        this.args = args;
        this.config = config;

        this.options = options;

        this.executable = this.args.app;
        if ( this.executable.charAt( 0 ) !== "/" ) {
            this.executable = this.options.cwd + "/" + this.executable;
        }

        this.directory = path.dirname( this.executable );
        this.process_args = [ this.executable ].concat( this.args.app_args );


        if ( ! this.config.execute ) {
            this.config.execute = process.execPath;
        }
    };

Application.prototype.start = function() {
    if ( ! this.process ) {
        var self = this,
            child = spawn( self.config.execute, self.process_args, { cwd: self.options.cwd } );

        child.stdout.on( 'data', function( data ) {
            postal.channel( "application", "output" ).publish( { data: data.toString() } );
        });

        child.stderr.on( 'data', function( data ) {
            postal.channel( "application", "error" ).publish( { data: data.toString() } );
            if (/^execvp\(\)/.test(data)) {
                // Figure out what we want to do with this
                console.log('Failed to start child process.');
            }
        });

        child.on( 'exit', function( code, signal ) {
            postal.channel( "application", "exit" ).publish( { code: code, signal: signal } );
            postal.channel( "forge", "exit" ).publish( "[forge] Process " + child.pid + " has terminated" );
        } );

        postal.channel( "forge", "start").publish( { pid: child.pid, data: "[forge] Starting Process: PID " + child.pid + ": " + self.executable } );
        this.process = child;
    }
};

Application.prototype.stop = function() {
    if ( this.process ) {
        this.process.kill();
    }
};

Application.prototype.restart = function() {
    var self = this;
    postal.channel( "forge", "restart" ).publish( {pid: self.process.pid, data: "[forge] Restarting Process: PID " + self.process.pid} );
    this.stop();
    this.start();
};

Application.prototype.watch = function() {

};

Application.prototype.update = function() {

};

exports.create = function(args, config, options) {

    return new Application(args, config, options);

};