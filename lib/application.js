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
    _ = require( "underscore" ),
    postal = require( "postal" ),
    cp = require( "child_process" ),
    Step = require( "Step" ),
    spawn = cp.spawn,
    Application = function(args, config, options) {
        // Will contain the child process information
        this.process = null;

        // CLI Arguments
        this.args = args;

        // The config object containing the default config + options from the CLI
        this.config = config;

        // Options, i.e., cwd
        this.options = options;

        // Find the executable file to be run
        this.executable = this.args.app;
        if ( this.executable.charAt( 0 ) !== "/" ) {
            this.executable = this.options.cwd + "/" + this.executable;
        }

        // The root directory of the running application
        this.directory = path.dirname( this.executable );

        // The arguments as they should be formatted to be passed into cp.spawn()
        this.process_args = [ this.executable ].concat( this.args.app_args );

        // Use the node.js executable running this forge process if no executable is specified
        if ( ! this.config.execute ) {
            this.config.execute = process.execPath;
        }

        // Attempt to load application specific configuration from forge.json
        // in the application root directory
        var app_cfg_file = this.directory + "/" + this.config.app_cfg_file,
            app_cfg;
        if ( fs.existsSync( app_cfg_file ) ) {
            app_cfg = JSON.parse( fs.readFileSync( app_cfg_file ) );

            if ( app_cfg ) {
                _.extend( this.config, app_cfg );
            }
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
        this.process = null;
    }
};

Application.prototype.restart = function() {
    var self = this;
    postal.channel( "forge", "restart" ).publish( {pid: self.process.pid, data: "[forge] Restarting Process: PID " + self.process.pid} );
    this.stop();
    this.start();
};


Application.prototype.update = function() {
    // Update repository from git
    var rev = (this.config.git && this.config.git.revision) || 'master',
        remote = (this.config.git && this.config.git.remote) || 'origin',
        cwd = this.directory,
        self = this;

    Step(
        function gitUpdate() {
            postal.channel( "forge", "output").publish( {data: "[forge] Updating repository"});
            cp.exec( "git reset --hard " + rev + " && git pull " + remote + " " + rev, { cwd: cwd }, this);
        },
        function handleGitOutput(err, stdout, stderr) {
            if ( err ) {
                postal.channel( "forge", "error" ).publish( {data: err } );
            } else {
                postal.channel( "forge", "output").publish( { data: stdout.toString() } );
            }
            this();
        },
        function runPostUpdateScript() {
            if ( self.config.scripts && self.config.scripts.update ) {
                postal.channel( "forge", "output").publish( {data: "[forge] Running update script"});
                cp.exec( self.config.scripts.update, { cwd: cwd }, this);
            } else {
                this('', 'No update script specified');
            }
        },
        function restartApp( err, stdout, stderr ) {
            if ( err ) {
                postal.channel( "forge", "error" ).publish( {data: err } );
            } else if ( stdout ) {
                postal.channel( "forge", "output").publish( { data: stdout.toString() } );
            }
            self.restart();
        }
    );
    
};

exports.create = function(args, config, options) {

    return new Application(args, config, options);

};