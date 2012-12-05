/*
    forge - A Node.js tool for continuous integration
    version:    0.0.1
    author:     Brian Edgerton <bedgerton@appendto.com> (http://appendto.com)
    copyright:  2012
    license:    Dual licensed
                MIT (http://www.opensource.org/licenses/mit-license)
                GPL (http://www.opensource.org/licenses/gpl-license)
*/

var winston = require( "winston" ),
    initialized = false,
    forge_log,
    app_log,
    setup = function( config ) {

        var silent = config.silent || false;

        var console_transport = new winston.transports.Console({
            colorize: true,
            silent: silent
        });

        forge_log = new (winston.Logger)({
            transports: [ console_transport ],
            colors: {}
        });

        app_log = new (winston.Logger)({
            transports: [ console_transport ],
            colors: {}
        });

        initialized = true;
    };

module.exports = function( config ) {

    if ( ! initialized ) {
        setup( config );
    }

    return {
        forge: forge_log,
        app: app_log
    };

};