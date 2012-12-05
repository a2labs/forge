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
    logger = require( "./logger.js" )(),
    cp = require( "child_process" ),
    Step = require( "Step" ),
    forever = require( "forever-monitor" ),
    update = require( "./update.js" ),
    spawn = cp.spawn,
    cleanupExecutable = function( path, default_cwd ) {
        if ( path.charAt( 0 ) !== "/" ) {
            path = default_cwd + "/" + path;
        }
        return path;
    },
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

        // Use the node.js executable running this forge process if no executable is specified
        if ( ! this.config.bin ) {
            this.config.bin = process.execPath;
        }

        // Find the executable file to be run
        if ( this.args.app ) {

            this.executable = cleanupExecutable(this.args.app, this.options.cwd);

            // The root directory of the running application
            this.directory = path.dirname( this.executable );

        } else {

            this.directory = this.options.cwd;

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

        if ( !this.executable && this.config.executable ) {
            this.executable = cleanupExecutable( this.config.executable, this.options.cwd );
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
            logger.forge.info( "Process started with PID " + data.pid );
            self.child.data = data;
        });

        process.on( 'exit', function( code, signal ) {
            //log( "application", "system.exit" ).publish( { code: code, signal: signal } );
            logger.forge.info( "Process has terminated" );
        } );

        process.on( 'stdout', function( data ) {
            logger.app.info( data.toString() );
        });

        process.on( 'stderr', function( data ) {
            if (/^execvp\(\)/.test(data)) {
                logger.forge.error( "Failed to start child process" );
            } else {
                logger.app.warn( data.toString() );
            }
        });
        
        process.start();
        this.child.process = process;
    }
};

Application.prototype.stop = function( restart, done ) {
    var self = this;

    if ( this.child.process && this.child.process.running ) {
        restart = restart || false;
        done = done || null;

        this.child.process.on( 'stop', function( data ) {
            self.reset();

            if ( done ) {
                done();
            }

            if ( restart ) {
                self.start();
            }
        });

        this.child.process.stop();
    } else if ( restart ) {
        self.start();
    }
};

Application.prototype.reset = function() {
    this.child.process = null;
    this.child.data = null;
};

Application.prototype.restart = function() {
    var self = this;
    logger.forge.info( "Restarting Process" );
    this.stop( true );
};

Application.prototype.update = function( done ) {
    update.safe( this, done );
};

exports.create = function(args, config, options) {

    return new Application(args, config, options);

};