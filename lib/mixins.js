/*
    forge - A Node.js tool for continuous integration
    version:    0.1.1
    author:     Brian Edgerton <bedgerton@appendto.com> (http://appendto.com)
    copyright:  2012
    license:    Dual licensed
                MIT (http://www.opensource.org/licenses/mit-license)
                GPL (http://www.opensource.org/licenses/gpl-license)
*/

var _ = require( "underscore" );

_.str = require('underscore.string');
_.mixin(_.str.exports());


// Thanks to Jim Cowart for help with this approach
// adapted from -> http://jsfiddle.net/ifandelse/TDwZy/
var slice = Array.prototype.slice;
if ( !_.deepExtend ) {
    var behavior = {
        "*": function( target, property, value ) {
            target[ property ] = value;
        },
        "object": function(target, property, value ) {
            if( _.isObject( target[ property ] ) ) {
                target[ property ] = deepExtend( target[ property ] || {}, value );
            } else {
                target[ property ] = value;
            }
        },
        "array": function( target, property, value ) {
            target[ property ] = _.filter(
                                    _.union( target[ property ], value ),
                                    function( x ) {
                                        return x;
                                    } );
        }
    },
    getType = function( value ) {
        if( _.isArray( value ) ) {
            return "array";
        } else if ( _.isRegExp( value ) ) {
            return "regex";
        } else if ( _.isDate( value ) ) {
            return "date";
        } else {
            return typeof value;
        }
    },
    getHandlerName = function( value ) {
        var type = getType( value );
        return behavior[ type ] ? type : "*";
    },
    deepExtend = function( target ) {
        _.each( slice.call( arguments, 1 ), function( source ) {
            _.each( source, function( value, property ) {
                behavior[ getHandlerName( value ) ]( target, property, value );
            });
        });
        return target;
    };
    _.mixin( {
        deepExtend: deepExtend
    } );
}