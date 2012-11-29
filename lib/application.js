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
    forever = require( "forever-monitor" ),
    spawn = cp.spawn,
    Application = function(args, config, options) {
        // Will contain the child process information
        this.child = {
            process: null,
            data: null
        };

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
    if ( ! this.child.process || ! this.child.process.running ) {

        var self = this,
            child_options = {
                options: self.args.app_args,
                cwd: self.options.cwd,
                max: 5,
                silent: true
            };


        var process = new forever.Monitor( self.executable, child_options );
        
        process.on( 'start', function( err, data ) {
            postal.channel( "forge", "start" ).publish( { data: "[forge] Process started with PID " + data.pid } );
            self.child.data = data;
        });

        process.on( 'exit', function( code, signal ) {
            postal.channel( "application", "exit" ).publish( { code: code, signal: signal } );
            postal.channel( "forge", "exit" ).publish( "[forge] Process has terminated" );
        } );

        process.on( 'stdout', function( data ) {
            postal.channel( "application", "output" ).publish( { data: data.toString() } );
        });

        process.on( 'stderr', function( data ) {
            postal.channel( "application", "error" ).publish( { data: data.toString() } );
            if (/^execvp\(\)/.test(data)) {
                // Figure out what we want to do with this
                console.log('Failed to start child process.');
            }
        });
        
        process.start();
        this.child.process = process;
    }
};

Application.prototype.stop = function( restart, cb ) {
    if ( this.child.process && this.child.process.running ) {
        restart = restart || false;
        cb = cb || null;

        var self = this;

        this.child.process.on( 'stop', function( data ) {
            self.reset();
            if ( cb ) {
                cb();
            }

            if ( restart ) {
                self.start();
            }
        });

        this.child.process.stop();
    }
};

Application.prototype.reset = function() {
    this.child.process = null;
    this.child.data = null;
};

Application.prototype.restart = function() {
    var self = this;
    postal.channel( "forge", "restart" ).publish( {pid: self.child.data.pid, data: "[forge] Restarting Process: PID " + self.child.data.pid} );
    this.stop( true );
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
            cp.exec( "git reset --hard " + rev + " && git pull " + remote + " " + rev + " && npm install", { cwd: cwd }, this);
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