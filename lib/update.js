/*
    forge - A Node.js tool for continuous integration
    version:    0.1.1
    author:     Brian Edgerton <bedgerton@appendto.com> (http://appendto.com)
    copyright:  2012
    license:    Dual licensed
                MIT (http://www.opensource.org/licenses/mit-license)
                GPL (http://www.opensource.org/licenses/gpl-license)
*/

var cp = require( "child_process" ),
    Step = require( "Step" ),
    machina = require( "machina" ),
    postal = require( "postal" ),
    logger = require( "./logger.js" );

var updater = {

    getCurrentRevision: function( options, done ) {
        options = options || {};
        cp.exec( 'git rev-parse HEAD', options, function( err, out ) {
            var result = out.trim();
            done( err, result );
        });
    },

    gitUpdate: function( revision, remote, options, done ) {
        options = options || {};
        logger.forge.info( "Updating repository" );
        cp.exec( "git reset --hard " + revision + " && git pull " + remote + " " + revision, options, function(err, stdout, stderr) {
            if ( err ) {
                logger.forge.error( err.toString() );
            } else {
                logger.forge.info( stdout.toString() );
            }
            done( err );
        });
    },

    gitResetRevision: function( revision, options, done ) {
        options = options || {};
        logger.forge.info( "Resetting to revision " + revision );
        cp.exec( "git reset --hard " + revision, options, function(err, stdout, stderr) {
            if ( err ) {
                logger.forge.error( err.toString() );
            } else {
                logger.forge.info( stdout.toString() );
            }
            done( err );
        });
    },

    runPostUpdateScript: function( app, options, done ) {
        options = options || {};
        if ( app.config.scripts && app.config.scripts.update ) {
            
            logger.forge.info( "Running update script" );

            cp.exec( app.config.scripts.update, options, function( err, stdout, stderr ) {
                if ( err ) {
                    logger.forge.error( err );
                } else if ( stdout ) {
                    logger.forge.info( stdout.toString() );
                }
                if ( done ) {
                    done( err );
                }
            });

        } else {

            logger.forge.info( 'No update script specified' );
            
            done();

        }
        
    },

    safe: function( app, done ) {
        var fsm = updater.fsm( app );

        
        fsm.on( 'success', function() {
            postal.channel("forge", "update.end").publish( {data: true} );
            if ( done ) {
                done();
            }
        });

        fsm.on( 'failure', function() {
            postal.channel("forge", "update.end").publish( {data: true} );
            logger.forge.error( "Update failed and the repo could not be rolled back" );
        });

        postal.channel("forge", "update.start").publish( {data: true} );
        fsm.transition( "starting" );

    },
    fsm: function( app ) {

        var revision = (app.config.git && app.config.git.revision) || 'master',
            remote = (app.config.git && app.config.git.remote) || 'origin',
            cwd = app.directory;

        var fsm = new machina.Fsm( {

            cache: {
                app: app,
                revision: revision,
                remote: remote,
                cwd: cwd,
                current_revision_sha: null
            },

            initialState: "waiting",

            next: function( action, err ) {
                if ( err ) {
                    fsm.handle( "error", { error: err } );
                } else if ( action === "success" ) {
                    fsm.emit( "success" );
                } else {
                    fsm.handle( action );
                }
            },

            states: {

                waiting: {
                    "*": function() {
                        logger.forge.error("Still waiting to start...");
                    }
                },

                starting: {
                    _onEnter: function() {
                        updater.getCurrentRevision( {cwd: fsm.cache.cwd}, function( err, result ) {
                            fsm.cache.current_revision_sha = result;
                            fsm.transition( "updating" );
                        });
                    }
                },

                updating: {
                    _onEnter: function() {
                        fsm.handle( "updateRepo" );
                    },

                    error: "rollingback",

                    updateRepo: function() {
                        updater.gitUpdate( fsm.cache.revision, fsm.cache.remote, {cwd: fsm.cache.cwd}, function( err ) {
                            fsm.next( "tryUpdateScripts", err );
                        });
                    },

                    tryUpdateScripts: function() {
                        updater.runPostUpdateScript( fsm.cache.app, {cwd: fsm.cache.cwd}, function( err ) {
                            fsm.next( "success", err );
                        });
                    }
                },

                rollingback: {
                    _onEnter: function() {
                        fsm.handle( "rollbackRevision" );
                    },

                    error: function( err ) {
                        // Need to figure out how to handle rollback errors
                        fsm.emit( "failure" );
                    },

                    // Step 1: git reset --hard REVISION
                    rollbackRevision: function() {
                        updater.gitResetRevision( fsm.cache.current_revision_sha, {cwd: fsm.cache.cwd}, function( err ) {
                            fsm.next( "tryUpdateScripts", err );
                        });
                    },

                    // Step 2: Attempt update scripts and hope for the best
                    tryUpdateScripts: function () {
                        updater.runPostUpdateScript( fsm.cache.app, {cwd: fsm.cache.cwd}, function( err ) {
                            fsm.next( "success", err );
                        } );
                    }
                }

            }

        });

        return fsm;
    }
};

module.exports = updater;