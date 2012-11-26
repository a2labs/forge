#!/usr/bin/env node

/*
    forge - A Node.js tool for continuous integration
    version:    0.0.1
    author:     Brian Edgerton <bedgerton@appendto.com> (http://appendto.com)
    copyright:  2012
    license:    Dual licensed
                MIT (http://www.opensource.org/licenses/mit-license)
                GPL (http://www.opensource.org/licenses/gpl-license)
*/

var libpath = __dirname + "/lib",
    args = require( libpath + "/args.js" ).parse( process.argv );
    config_file = process.env['FORGE_CFG_FILE'] || __dirname + "/config.json",
    config = require( libpath + "/config.js" ).init( config_file, args.options ),
    cwd = process.cwd(),
    app = require( libpath + "/application.js" ).create( args, config, {cwd: cwd }),
    logger = require( libpath + "/logger.js" ).init( app.config ),
    runner = require( libpath + "/runner.js" );

    runner.go( app, process );