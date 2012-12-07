/*
    forge - A Node.js tool for continuous integration
    version:    0.1.1
    author:     Brian Edgerton <bedgerton@appendto.com> (http://appendto.com)
    copyright:  2012
    license:    Dual licensed
                MIT (http://www.opensource.org/licenses/mit-license)
                GPL (http://www.opensource.org/licenses/gpl-license)
*/

var winston = require( "winston" ),
    console_transport = new winston.transports.Console({
        colorize: true
    }),
    Logger = {
        forge: new (winston.Logger)({
            transports: [ console_transport ],
            colors: {}
        }),
        app: new (winston.Logger)({
            transports: [ console_transport ],
            colors: {}
        }),
        silence: function() {
            Logger.forge.transports.console.silent = true;
            Logger.app.transports.console.silent = true;
            return Logger;
        },
        configure: function( config ) {
            if ( config.silent ) {
                Logger.silence();
            }
            return Logger;
        }
    };

module.exports = Logger;