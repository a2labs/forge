/*
    forge - A Node.js tool for continuous integration
    version:    0.0.1
    author:     Brian Edgerton <bedgerton@appendto.com> (http://appendto.com)
    copyright:  2012
    license:    Dual licensed
                MIT (http://www.opensource.org/licenses/mit-license)
                GPL (http://www.opensource.org/licenses/gpl-license)
*/

var cp = require( "child_process" ),
    Step = require( "Step" ),
    postal = require( "postal" ),
    revision,
    remote,
    cwd,
    current_revision;

var updater = {

    getCurrentRevision: function( done ) {
        cp.exec( 'git rev-parse HEAD', function( err, out ) {
            var result = out.trim();
            done( err, result );
        });
    },

    gitUpdate: function( done ) {
        postal.channel( "forge", "log.output").publish( {data: "[forge] Updating repository"});
        cp.exec( "git reset --hard " + revision + " && git pull " + remote + " " + revision, { cwd: cwd }, function(err, stdout, stderr) {
            if ( err ) {
                postal.channel( "forge", "log.error" ).publish( {data: err } );
            } else {
                postal.channel( "forge", "log.output").publish( { data: stdout.toString() } );
            }
            done( err );
        });
    },

    gitResetRevision: function( old_revision, done ) {
        postal.channel( "forge", "log.output").publish( {data: "[forge] Resetting to revision " + old_revision});
        cp.exec( "git reset --hard " + old_revision, { cwd: cwd }, function(err, stdout, stderr) {
            if ( err ) {
                postal.channel( "forge", "log.error" ).publish( {data: err } );
            } else {
                postal.channel( "forge", "log.output").publish( { data: stdout.toString() } );
            }
            done( err );
        });
    },

    runPostUpdateScript: function( done ) {
        if ( app.config.scripts && app.config.scripts.update ) {
            
            postal.channel( "forge", "log.output").publish( {data: "[forge] Running update script"});

            cp.exec( app.config.scripts.update, { cwd: cwd }, function( err, stdout, stderr ) {
                if ( err ) {
                    // Git pull failed, time to roll back to previous revision
                    postal.channel( "forge", "log.error" ).publish( { data: err } );
                } else if ( stdout ) {
                    postal.channel( "forge", "log.output").publish( { data: stdout.toString() } );
                }
                if ( done ) {
                    done( err );
                }
            });

        } else {

            postal.channel( "forge", "log.output", 'No update script specified' );
            
            done();

        }
        
    },

    safe: function( app, done ) {
        done = done || function(){};

        // Update repository from git
        revision = (app.config.git && app.config.git.revision) || 'master';
        remote = (app.config.git && app.config.git.remote) || 'origin';
        cwd = app.directory;

        Step(
            // Step 1: Store current revision number in case we need to rollback
            function saveRevision() {
                var step = this;
                updater.getCurrentRevision( function( err, result ) {
                    current_revision = result;
                    step();
                });
            },
            // Step 2: Run the update sequence
            function attemptUpdate() {
                var step = this;
                updater.updateSequence( app, function( err ) {
                    step( err );
                });
            },
            // Step 3: Try to rollback if there was a failure, otherwise run done callback
            function postUpdate( err ) {
                if ( err ) {
                    // Update failed, need to rollback
                    updater.rollbackSequence( app, done );
                } else {
                    // Everything was fine, we return to our regularly scheduled programming
                    done();
                }
            }
        );
    },

    updateSequence: function( app, done ) {
        done = done || function(){};
        var update_failed = false;

        Step(
            // Step 1: pull in the latest code from git
            function updateRepo() {
                var step = this;
                updater.gitUpdate( function( err ) {
                    if ( err ) {
                        update_failed = true;
                    }
                    step( update_failed );
                });
            },
            // Step 2: If git updated successfully, run the specified update commands
            function tryUpdateScripts( failed ) {
                if ( failed ) {
                    // Update process has already failed, run callback with failure message
                    done( failed );
                    return;
                }
                updater.runPostUpdateScript( function( err ) {
                    if ( err ) {
                        update_failed = true;
                    }
                    done( update_failed );
                });
            }
        );
    },

    rollbackSequence: function( app, done ) {
        done = done || function(){};
        Step(
            // Step 1: git reset --hard REVISION
            function rollbackRevision() {
                var step = this;
                updater.gitResetRevision( current_revision, function( err ) {
                    step();
                } );
            },
            // Step 2: Attempt update scripts and hope for the best
            function tryUpdateScripts() {
                var step = this;
                updater.runPostUpdateScript( function( err ) {
                    if ( err ) {
                        // There is a problem with the update script
                    }
                    done();
                } );
            }
        );

    }
};

module.exports = updater;