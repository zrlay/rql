/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 1);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
 * This module provides RQL parsing. For example:
 * var parsed = require("./parser").parse("b=3&le(c,5)");
 */
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [exports, __webpack_require__(2)], __WEBPACK_AMD_DEFINE_RESULT__ = function(exports, contains){

var operatorMap = {
	"=": "eq",
	"==": "eq",
	">": "gt",
	">=": "ge",
	"<": "lt",
	"<=": "le",
	"!=": "ne"
};


exports.primaryKeyName = 'id';
exports.lastSeen = ['sort', 'select', 'values', 'limit'];
exports.jsonQueryCompatible = true;

function parse(/*String|Object*/query, parameters){
	if (typeof query === "undefined" || query === null)
		query = '';
	var term = new exports.Query();
	var topTerm = term;
	topTerm.cache = {}; // room for lastSeen params
	var topTermName = topTerm.name;
	topTerm.name = '';
	if(typeof query === "object"){
		if(query instanceof exports.Query){
			return query;
		}
		for(var i in query){
			var term = new exports.Query();
			topTerm.args.push(term);
			term.name = "eq";
			term.args = [i, query[i]];
		}
		return topTerm;
	}
	if(query.charAt(0) === "?"){
		throw new URIError("Query must not start with ?");
	}
	if(exports.jsonQueryCompatible){
		query = query.replace(/%3C=/g,"=le=").replace(/%3E=/g,"=ge=").replace(/%3C/g,"=lt=").replace(/%3E/g,"=gt=");
	}
	if(query.indexOf("/") > -1){ // performance guard
		// convert slash delimited text to arrays
		query = query.replace(/[\+\*\$\-:\w%\._]*\/[\+\*\$\-:\w%\._\/]*/g, function(slashed){
			return "(" + slashed.replace(/\//g, ",") + ")";
		});
	}
	// convert FIQL to normalized call syntax form
	query = query.replace(/(\([\+\*\$\-:\w%\._,]+\)|[\+\*\$\-:\w%\._]*|)([<>!]?=(?:[\w]*=)?|>|<)(\([\+\*\$\-:\w%\._,]+\)|[\+\*\$\-:\w%\._]*|)/g,
						// <---------       property        -----------><------  operator -----><----------------   value ------------------>
			function(t, property, operator, value){
		if(operator.length < 3){
			if(!operatorMap[operator]){
				throw new URIError("Illegal operator " + operator);
			}
			operator = operatorMap[operator];
		}
		else{
			operator = operator.substring(1, operator.length - 1);
		}
		return operator + '(' + property + "," + value + ")";
	});
	if(query.charAt(0)==="?"){
		query = query.substring(1);
	}
	var leftoverCharacters = query.replace(/(\))|([&\|,])?([\+\*\$\-:\w%\._]*)(\(?)/g,
							//   <-closedParan->|<-delim-- propertyOrValue -----(> |
		function(t, closedParan, delim, propertyOrValue, openParan){
			if(delim){
				if(delim === "&"){
					setConjunction("and");
				}
				if(delim === "|"){
					setConjunction("or");
				}
			}
			if(openParan){
				var newTerm = new exports.Query();
				newTerm.name = propertyOrValue;
				newTerm.parent = term;
				call(newTerm);
			}
			else if(closedParan){
				var isArray = !term.name;
				term = term.parent;
				if(!term){
					throw new URIError("Closing paranthesis without an opening paranthesis");
				}
				if(isArray){
					term.args.push(term.args.pop().args);
				}
			}
			else if(propertyOrValue || delim === ','){
				term.args.push(stringToValue(propertyOrValue, parameters));

				// cache the last seen sort(), select(), values() and limit()
				if (contains(exports.lastSeen, term.name)) {
					topTerm.cache[term.name] = term.args;
				}
				// cache the last seen id equality
				if (term.name === 'eq' && term.args[0] === exports.primaryKeyName) {
					var id = term.args[1];
					if (id && !(id instanceof RegExp)) id = id.toString();
					topTerm.cache[exports.primaryKeyName] = id;
				}
			}
			return "";
		});
	if(term.parent){
		throw new URIError("Opening paranthesis without a closing paranthesis");
	}
	if(leftoverCharacters){
		// any extra characters left over from the replace indicates invalid syntax
		throw new URIError("Illegal character in query string encountered " + leftoverCharacters);
	}

	function call(newTerm){
		term.args.push(newTerm);
		term = newTerm;
		// cache the last seen sort(), select(), values() and limit()
		if (contains(exports.lastSeen, term.name)) {
			topTerm.cache[term.name] = term.args;
		}
	}
	function setConjunction(operator){
		if(!term.name){
			term.name = operator;
		}
		else if(term.name !== operator){
			throw new Error("Can not mix conjunctions within a group, use paranthesis around each set of same conjuctions (& and |)");
		}
	}
	function removeParentProperty(obj) {
		if(obj && obj.args){
			delete obj.parent;
			var args = obj.args;
			for(var i = 0, l = args.length; i < l; i++){
				removeParentProperty(args[i]);
			}
		}
		return obj;
	};
	removeParentProperty(topTerm);
	if (!topTerm.name) {
		topTerm.name = topTermName;
	}
	return topTerm;
};

exports.parse = exports.parseQuery = parse;

/* dumps undesirable exceptions to Query().error */
exports.parseGently = function(){
	var terms;
	try {
		terms = parse.apply(this, arguments);
	} catch(err) {
		terms = new exports.Query();
		terms.error = err.message;
	}
	return terms;
}

exports.commonOperatorMap = {
	"and" : "&",
	"or" : "|",
	"eq" : "=",
	"ne" : "!=",
	"le" : "<=",
	"ge" : ">=",
	"lt" : "<",
	"gt" : ">"
}
function stringToValue(string, parameters){
	var converter = exports.converters['default'];
	if(string.charAt(0) === "$"){
		var param_index = parseInt(string.substring(1)) - 1;
		return param_index >= 0 && parameters ? parameters[param_index] : undefined;
	}
	if(string.indexOf(":") > -1){
		var parts = string.split(":");
		converter = exports.converters[parts[0]];
		if(!converter){
			throw new URIError("Unknown converter " + parts[0]);
		}
		string = parts.slice(1).join(':');
	}
	return converter(string);
};

var autoConverted = exports.autoConverted = {
	"true": true,
	"false": false,
	"null": null,
	"undefined": undefined,
	"Infinity": Infinity,
	"-Infinity": -Infinity
};

exports.converters = {
	auto: function(string){
		if(autoConverted.hasOwnProperty(string)){
			return autoConverted[string];
		}
		var number = +string;
		if(isNaN(number) || number.toString() !== string){
          /*var isoDate = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/.exec(x);
          if (isoDate) {
            date = new Date(Date.UTC(+isoDate[1], +isoDate[2] - 1, +isoDate[3], +isoDate[4], +isoDate[5], +isoDate[6], +isoDate[7] || 0));
          }*/
			string = decodeURIComponent(string);
			if(exports.jsonQueryCompatible){
				if(string.charAt(0) == "'" && string.charAt(string.length-1) == "'"){
					return JSON.parse('"' + string.substring(1,string.length-1) + '"');
				}
			}
			return string;
		}
		return number;
	},
	number: function(x){
		var number = +x;
		if(isNaN(number)){
			throw new URIError("Invalid number " + number);
		}
		return number;
	},
	epoch: function(x){
		var date = new Date(+x);
		if (isNaN(date.getTime())) {
			throw new URIError("Invalid date " + x);
		}
		return date;
	},
	isodate: function(x){
		// four-digit year
		var date = '0000'.substr(0,4-x.length)+x;
		// pattern for partial dates
		date += '0000-01-01T00:00:00Z'.substring(date.length);
		return exports.converters.date(date);
	},
	date: function(x){
		var isoDate = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/.exec(x);
		var date;
		if (isoDate) {
			date = new Date(Date.UTC(+isoDate[1], +isoDate[2] - 1, +isoDate[3], +isoDate[4], +isoDate[5], +isoDate[6], +isoDate[7] || 0));
		}else{
			date = new Date(x);
		}
		if (isNaN(date.getTime())){
			throw new URIError("Invalid date " + x);
		}
		return date;
	},
	"boolean": function(x){
		return x === "true";
	},
	string: function(string){
		return decodeURIComponent(string);
	},
	re: function(x){
		return new RegExp(decodeURIComponent(x), 'i');
	},
	RE: function(x){
		return new RegExp(decodeURIComponent(x));
	},
	glob: function(x){
		var s = decodeURIComponent(x).replace(/([\\|\||\(|\)|\[|\{|\^|\$|\*|\+|\?|\.|\<|\>])/g, function(x){return '\\'+x;}).replace(/\\\*/g,'.*').replace(/\\\?/g,'.?');
		if (s.substring(0,2) !== '.*') s = '^'+s; else s = s.substring(2);
		if (s.substring(s.length-2) !== '.*') s = s+'$'; else s = s.substring(0, s.length-2);
		return new RegExp(s, 'i');
	}
};

// exports.converters["default"] can be changed to a different converter if you want
// a different default converter, for example:
// RP = require("rql/parser");
// RP.converters["default"] = RQ.converter.string;
exports.converters["default"] = exports.converters.auto;

// this can get replaced by the chainable query if query.js is loaded
exports.Query = function(){
	this.name = "and";
	this.args = [];
};
return exports;
}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

/*global angular,window*/

(function withAngular(angular, window) {
  "use strict";

  var parserProvider = function parserProvider() {
    return __webpack_require__(0);
  };
  var queryProvider = function queryProvider() {
    return __webpack_require__(3);
  };

  angular
    .module("rql", [])
    .factory("rqlParser", parserProvider)
    .factory("rqlQuery", queryProvider);
})(angular, window);


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function(){
return contains;

function contains(array, item){
	for(var i = 0, l = array.length; i < l; i++){
		if(array[i] === item){
			return true;
		}
	}
}
}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
 * Provides a Query constructor with chainable capability. For example:
 * var Query = require("./query").Query;
 * query = Query();
 * query.executor = function(query){
 *		require("./js-array").query(query, params, data); // if we want to operate on an array
 * };
 * query.eq("a", 3).le("b", 4).forEach(function(object){
 *	 // for each object that matches the query
 * });
 */
//({define:typeof define!="undefined"?define:function(deps, factory){module.exports = factory(exports, require("./parser"), require("./js-array"));}}).
//define(["exports", "./parser", "./js-array"], function(exports, parser, jsarray){
!(__WEBPACK_AMD_DEFINE_ARRAY__ = [exports, __webpack_require__(0), __webpack_require__(4)], __WEBPACK_AMD_DEFINE_RESULT__ = function(exports, parser, each){

var parseQuery = parser.parseQuery;
try{
	var when = __webpack_require__(5).when;
}catch(e){
	when = function(value, callback){callback(value)};
}

parser.Query = function(seed, params){
	if (typeof seed === 'string')
		return parseQuery(seed, params);
	var q = new Query();
	if (seed && seed.name && seed.args)
		q.name = seed.name, q.args = seed.args;
	return q;
};
exports.Query = parser.Query;
//TODO:THE RIGHT WAY IS:exports.knownOperators = Object.keys(jsarray.operators || {}).concat(Object.keys(jsarray.jsOperatorMap || {}));
exports.knownOperators = ["sort", "match", "in", "out", "or", "and", "select", "contains", "excludes", "values", "limit", "distinct", "recurse", "aggregate", "between", "sum", "mean", "max", "min", "count", "first", "one", "eq", "ne", "le", "ge", "lt", "gt"];
exports.knownScalarOperators = ["mean", "sum", "min", "max", "count", "first", "one"];
exports.arrayMethods = ["forEach", "reduce", "map", "filter", "indexOf", "some", "every"];

function Query(name){
	this.name = name || "and";
	this.args = [];
}
function serializeArgs(array, delimiter){
	var results = [];
	for(var i = 0, l = array.length; i < l; i++){
		results.push(queryToString(array[i]));
	}
	return results.join(delimiter);
}
exports.Query.prototype = Query.prototype;
Query.prototype.toString = function(){
	return this.name === "and" ?
		serializeArgs(this.args, "&") :
		queryToString(this);
};

function queryToString(part) {
		if (part instanceof Array) {
				return '(' + serializeArgs(part, ",")+')';
		}
		if (part && part.name && part.args) {
				return [
						part.name,
						"(",
						serializeArgs(part.args, ","),
						")"
				].join("");
		}
		return exports.encodeValue(part);
};

function encodeString(s) {
		if (typeof s === "string") {
				s = encodeURIComponent(s);
				if (s.match(/[\(\)]/)) {
						s = s.replace("(","%28").replace(")","%29");
				};
		}
		return s;
}

exports.encodeValue = function(val) {
		var encoded;
		if (val === null) val = 'null';
		if (val !== parser.converters["default"]('' + (
				val.toISOString && val.toISOString() || val.toString()
		))) {
				var type = typeof val;
				if(val instanceof RegExp){
					// TODO: control whether to we want simpler glob() style
					val = val.toString();
					var i = val.lastIndexOf('/');
					type = val.substring(i).indexOf('i') >= 0 ? "re" : "RE";
					val = encodeString(val.substring(1, i));
					encoded = true;
				}
				if(type === "object"){
						type = "epoch";
						val = val.getTime();
						encoded = true;
				}
				if(type === "string") {
						val = encodeString(val);
						encoded = true;
				}
				val = [type, val].join(":");
		}
		if (!encoded && typeof val === "string") val = encodeString(val);
		return val;
};

exports.updateQueryMethods = function(){
	each(exports.knownOperators, function(name){
		Query.prototype[name] = function(){
			var newQuery = new Query();
			newQuery.executor = this.executor;
			var newTerm = new Query(name);
			newTerm.args = Array.prototype.slice.call(arguments);
			newQuery.args = this.args.concat([newTerm]);
			return newQuery;
		};
	});
	each(exports.knownScalarOperators, function(name){
		Query.prototype[name] = function(){
			var newQuery = new Query();
			newQuery.executor = this.executor;
			var newTerm = new Query(name);
			newTerm.args = Array.prototype.slice.call(arguments);
			newQuery.args = this.args.concat([newTerm]);
			return newQuery.executor(newQuery);
		};
	});
	each(exports.arrayMethods, function(name){
		// this makes no guarantee of ensuring that results supports these methods
		Query.prototype[name] = function(){
			var args = arguments;
			return when(this.executor(this), function(results){
				return results[name].apply(results, args);
			});
		};
	});

};

exports.updateQueryMethods();

/* recursively iterate over query terms calling 'fn' for each term */
Query.prototype.walk = function(fn, options){
	options = options || {};
	function walk(name, terms){
		terms = terms || [];

		var i = 0,
			l = terms.length,
			term,
			args,
			func,
			newTerm;

		for (; i < l; i++) {
			term = terms[i];
			if (term == null) {
				term = {};
			}
			func = term.name;
			args = term.args;
			if (!func || !args) {
				continue;
			}
			if (args[0] instanceof Query) {
				walk.call(this, func, args);
			}
			else {
				newTerm = fn.call(this, func, args);
				if (newTerm && newTerm.name && newTerm.ags) {
					terms[i] = newTerm;
				}
			}
		}
	}
	walk.call(this, this.name, this.args);
};

/* append a new term */
Query.prototype.push = function(term){
	this.args.push(term);
	return this;
};

/* disambiguate query */
Query.prototype.normalize = function(options){
	options = options || {};
	options.primaryKey = options.primaryKey || 'id';
	options.map = options.map || {};
	var result = {
		original: this,
		sort: [],
		limit: [Infinity, 0, Infinity],
		skip: 0,
		limit: Infinity,
		select: [],
		values: false
	};
	var plusMinus = {
		// [plus, minus]
		sort: [1, -1],
		select: [1, 0]
	};
	function normal(func, args){
		// cache some parameters
		if (func === 'sort' || func === 'select') {
			result[func] = args;
			var pm = plusMinus[func];
			result[func+'Arr'] = result[func].map(function(x){
				if (x instanceof Array) x = x.join('.');
				var o = {};
				var a = /([-+]*)(.+)/.exec(x);
				o[a[2]] = pm[(a[1].charAt(0) === '-')*1];
				return o;
			});
			result[func+'Obj'] = {};
			result[func].forEach(function(x){
				if (x instanceof Array) x = x.join('.');
				var a = /([-+]*)(.+)/.exec(x);
				result[func+'Obj'][a[2]] = pm[(a[1].charAt(0) === '-')*1];
			});
		} else if (func === 'limit') {
			// validate limit() args to be numbers, with sane defaults
			var limit = args;
			result.skip = +limit[1] || 0;
			limit = +limit[0] || 0;
			if (options.hardLimit && limit > options.hardLimit)
				limit = options.hardLimit;
			result.limit = limit;
			result.needCount = true;
		} else if (func === 'values') {
			// N.B. values() just signals we want array of what we select()
			result.values = true;
		} else if (func === 'eq') {
			// cache primary key equality -- useful to distinguish between .get(id) and .query(query)
			var t = typeof args[1];
			//if ((args[0] instanceof Array ? args[0][args[0].length-1] : args[0]) === options.primaryKey && ['string','number'].indexOf(t) >= 0) {
			if (args[0] === options.primaryKey && ('string' === t || 'number' === t)) {
				result.pk = String(args[1]);
			}
		}
		// cache search conditions
		//if (options.known[func])
		// map some functions
		/*if (options.map[func]) {
			func = options.map[func];
		}*/
	}
	this.walk(normal);
	return result;
};

/* FIXME: an example will be welcome
Query.prototype.toMongo = function(options){
	return this.normalize({
		primaryKey: '_id',
		map: {
			ge: 'gte',
			le: 'lte'
		},
		known: ['lt','lte','gt','gte','ne','in','nin','not','mod','all','size','exists','type','elemMatch']
	});
};
*/

return exports;
}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function(){
return each;

function each(array, callback){
	var emit, result;
	if (callback.length > 1) {
		// can take a second param, emit
		result = [];
		emit = function(value){
			result.push(value);
		};
	}
	for(var i = 0, l = array.length; i < l; i++){
		if(callback(array[i], emit)){
			return result || true;
		}
	}
	return result;
}
}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_RESULT__;(function(define){
!(__WEBPACK_AMD_DEFINE_RESULT__ = function(require,exports){

// Kris Zyp

// this is based on the CommonJS spec for promises:
// http://wiki.commonjs.org/wiki/Promises
// Includes convenience functions for promises, much of this is taken from Tyler Close's ref_send
// and Kris Kowal's work on promises.
// // MIT License

// A typical usage:
// A default Promise constructor can be used to create a self-resolving deferred/promise:
// var Promise = require("promise").Promise;
//	var promise = new Promise();
// asyncOperation(function(){
//	Promise.resolve("succesful result");
// });
//	promise -> given to the consumer
//
//	A consumer can use the promise
//	promise.then(function(result){
//		... when the action is complete this is executed ...
//	 },
//	 function(error){
//		... executed when the promise fails
//	});
//
// Alternately, a provider can create a deferred and resolve it when it completes an action.
// The deferred object a promise object that provides a separation of consumer and producer to protect
// promises from being fulfilled by untrusted code.
// var defer = require("promise").defer;
//	var deferred = defer();
// asyncOperation(function(){
//	deferred.resolve("succesful result");
// });
//	deferred.promise -> given to the consumer
//
//	Another way that a consumer can use the promise (using promise.then is also allowed)
// var when = require("promise").when;
// when(promise,function(result){
//		... when the action is complete this is executed ...
//	 },
//	 function(error){
//		... executed when the promise fails
//	});

exports.errorTimeout = 100;
var freeze = Object.freeze || function(){};

/**
 * Default constructor that creates a self-resolving Promise. Not all promise implementations
 * need to use this constructor.
 */
var Promise = function(canceller){
};

/**
 * Promise implementations must provide a "then" function.
 */
Promise.prototype.then = function(resolvedCallback, errorCallback, progressCallback){
	throw new TypeError("The Promise base class is abstract, this function must be implemented by the Promise implementation");
};

/**
 * If an implementation of a promise supports a concurrency model that allows
 * execution to block until the promise is resolved, the wait function may be
 * added.
 */
/**
 * If an implementation of a promise can be cancelled, it may add this function
 */
 // Promise.prototype.cancel = function(){
 // };

Promise.prototype.get = function(propertyName){
	return this.then(function(value){
		return value[propertyName];
	});
};

Promise.prototype.put = function(propertyName, value){
	return this.then(function(object){
		return object[propertyName] = value;
	});
};

Promise.prototype.call = function(functionName /*, args */){
	var fnArgs = Array.prototype.slice.call(arguments, 1);
	return this.then(function(value){
		return value[functionName].apply(value, fnArgs);
	});
};

/**
 * This can be used to conviently resolve a promise with auto-handling of errors:
 * setTimeout(deferred.resolverCallback(function(){
 *   return doSomething();
 * }), 100);
 */
Promise.prototype.resolverCallback = function(callback){
	var self = this;
	return function(){
		try{
			self.resolve(callback());
		}catch(e){
			self.reject(e);
		}
	}
};

/** Dojo/NodeJS methods*/
Promise.prototype.addCallback = function(callback){
	return this.then(callback);
};

Promise.prototype.addErrback = function(errback){
	return this.then(function(){}, errback);
};

/*Dojo methods*/
Promise.prototype.addBoth = function(callback){
	return this.then(callback, callback);
};

Promise.prototype.addCallbacks = function(callback, errback){
	return this.then(callback, errback);
};

/*NodeJS method*/
Promise.prototype.wait = function(){
	return exports.wait(this);
};

Deferred.prototype = Promise.prototype;
// A deferred provides an API for creating and resolving a promise.
exports.Promise = exports.Deferred = exports.defer = defer;
function defer(canceller){
	return new Deferred(canceller);
}


// currentContext can be set to other values
// and mirrors the global. We need to go off the global in case of multiple instances
// of this module, which isn't rare with NPM's package policy.
Object.defineProperty && Object.defineProperty(exports, "currentContext", {
	set: function(value){
		currentContext = value;
	},
	get: function(){
		return currentContext;
	}
});
exports.currentContext = null;


function Deferred(canceller){
	var result, finished, isError, waiting = [], handled;
	var promise = this.promise = new Promise();
	var context = exports.currentContext;

	function notifyAll(value){
		var previousContext = exports.currentContext;
		if(finished){
			throw new Error("This deferred has already been resolved");
		}
		try{
			if(previousContext !== context){
				if(previousContext && previousContext.suspend){
					previousContext.suspend();
				}
				exports.currentContext = context;
				if(context && context.resume){
					context.resume();
				}
			}
			result = value;
			finished = true;
			for(var i = 0; i < waiting.length; i++){
				notify(waiting[i]);
			}
		}
		finally{
			if(previousContext !== context){
				if(context && context.suspend){
					context.suspend();
				}
				if(previousContext && previousContext.resume){
					previousContext.resume();
				}
				exports.currentContext = previousContext;
			}
		}
	}
	function notify(listener){
		var func = (isError ? listener.error : listener.resolved);
		if(func){
			handled ?
				(handled.handled = true) : (handled = true);
				try{
					var newResult = func(result);
					if(newResult && typeof newResult.then === "function"){
						newResult.then(listener.deferred.resolve, listener.deferred.reject);
						return;
					}
					listener.deferred.resolve(newResult);
				}
				catch(e){
					listener.deferred.reject(e);
				}
		}
		else{
			if(isError){
				listener.deferred.reject(result, typeof handled === "object" ? handled : (handled = {}));
			}
			else{
				listener.deferred.resolve.call(listener.deferred, result);
			}
		}
	}
	// calling resolve will resolve the promise
	this.resolve = this.callback = this.emitSuccess = function(value){
		notifyAll(value);
	};

	// calling error will indicate that the promise failed
	var reject = this.reject = this.errback = this.emitError = function(error, handledObject){
		if (typeof handledObject == "object") {
			if (handled) {
				handledObject.handled = true;
			} else {
				handled = handledObject;
			}
		}
		isError = true;
		notifyAll(error);
		if (!handledObject && typeof setTimeout !== "undefined") {
			if (!(typeof handled == "object" ? handled.handled : handled)) {
				// set the time out if it has not already been handled
				setTimeout(function () {
					if (!(typeof handled == "object" ? handled.handled : handled)) {
						throw error;
					}
				}, exports.errorTimeout);
			}
		}
		return handled;
	};

	// call progress to provide updates on the progress on the completion of the promise
	this.progress = function(update){
		for(var i = 0; i < waiting.length; i++){
			var progress = waiting[i].progress;
			progress && progress(update);
		}
	}
	// provide the implementation of the promise
	this.then = promise.then = function(resolvedCallback, errorCallback, progressCallback){
		var returnDeferred = new Deferred(promise.cancel);
		var listener = {resolved: resolvedCallback, error: errorCallback, progress: progressCallback, deferred: returnDeferred};
		if(finished){
			notify(listener);
		}
		else{
			waiting.push(listener);
		}
		return returnDeferred.promise;
	};
	var timeout;
	if(typeof setTimeout !== "undefined") {
		this.timeout = function (ms) {
			if (ms === undefined) {
				return timeout;
			}
			timeout = ms;
			setTimeout(function () {
				if (!finished) {
					if (promise.cancel) {
						promise.cancel(new Error("timeout"));
					}
					else {
						reject(new Error("timeout"));
					}
				}
			}, ms);
			return promise;
		};
	}

	if(canceller){
		this.cancel = promise.cancel = function(){
			var error = canceller();
			if(!(error instanceof Error)){
				error = new Error(error);
			}
			reject(error);
		}
	}
	freeze(promise);
};

function perform(value, async, sync){
	try{
		if(value && typeof value.then === "function"){
			value = async(value);
		}
		else{
			value = sync(value);
		}
		if(value && typeof value.then === "function"){
			return value;
		}
		var deferred = new Deferred();
		deferred.resolve(value);
		return deferred.promise;
	}catch(e){
		var deferred = new Deferred();
		deferred.reject(e);
		return deferred.promise;
	}

}
/**
 * Promise manager to make it easier to consume promises
 */

function rethrow(err){ throw err; }

/**
 * Registers an observer on a promise, always returning a promise
 * @param value		 promise or value to observe
 * @param resolvedCallback function to be called with the resolved value
 * @param rejectCallback	function to be called with the rejection reason
 * @param progressCallback	function to be called when progress is made
 * @return promise for the return value from the invoked callback
 */
exports.whenPromise = function(value, resolvedCallback, rejectCallback, progressCallback){
	var deferred = defer();
	if(value && typeof value.then === "function"){
		value.then(function(next){
			deferred.resolve(next);
		},function(error){
			deferred.reject(error);
		});
		rejectCallback = rejectCallback || rethrow;
	}else{
		deferred.resolve(value);
	}
	return deferred.promise.then(resolvedCallback, rejectCallback, progressCallback);
};

/**
 * Registers an observer on a promise.
 * @param value		 promise or value to observe
 * @param resolvedCallback function to be called with the resolved value
 * @param rejectCallback	function to be called with the rejection reason
 * @param progressCallback	function to be called when progress is made
 * @return promise for the return value from the invoked callback or the value if it
 * is a non-promise value
 */
exports.when = function(value, resolvedCallback, rejectCallback, progressCallback){
		if(value && typeof value.then === "function"){
				if(value instanceof Promise){
						return value.then(resolvedCallback, rejectCallback, progressCallback);
				}
				else{
						return exports.whenPromise(value, resolvedCallback, rejectCallback, progressCallback);
				}
		}
		return resolvedCallback ? resolvedCallback(value) : value;
};

/**
 * This is convenience function for catching synchronously and asynchronously thrown
 * errors. This is used like when() except you execute the initial action in a callback:
 * whenCall(function(){
 *   return doSomethingThatMayReturnAPromise();
 * }, successHandler, errorHandler);
 */
exports.whenCall = function(initialCallback, resolvedCallback, rejectCallback, progressCallback){
	try{
		return exports.when(initialCallback(), resolvedCallback, rejectCallback, progressCallback);
	}catch(e){
		return rejectCallback(e);
	}
}

/**
 * Gets the value of a property in a future turn.
 * @param target	promise or value for target object
 * @param property		name of property to get
 * @return promise for the property value
 */
exports.get = function(target, property){
	return perform(target, function(target){
		return target.get(property);
	},
	function(target){
		return target[property]
	});
};

/**
 * Invokes a method in a future turn.
 * @param target	promise or value for target object
 * @param methodName		name of method to invoke
 * @param args		array of invocation arguments
 * @return promise for the return value
 */
exports.call = function(target, methodName, args){
	return perform(target, function(target){
		return target.call(methodName, args);
	},
	function(target){
		return target[methodName].apply(target, args);
	});
};

/**
 * Sets the value of a property in a future turn.
 * @param target	promise or value for target object
 * @param property		name of property to set
 * @param value	 new value of property
 * @return promise for the return value
 */
exports.put = function(target, property, value){
	return perform(target, function(target){
		return target.put(property, value);
	},
	function(target){
		return target[property] = value;
	});
};


/**
 * Waits for the given promise to finish, blocking (and executing other events)
 * if necessary to wait for the promise to finish. If target is not a promise
 * it will return the target immediately. If the promise results in an reject,
 * that reject will be thrown.
 * @param target	 promise or value to wait for.
 * @return the value of the promise;
 */
var queue;
//try {
//		queue = require("event-loop");
//}
//catch (e) {}
exports.wait = function(target){
	if(!queue){
		throw new Error("Can not wait, the event-queue module is not available");
	}
	if(target && typeof target.then === "function"){
		var isFinished, isError, result;
		target.then(function(value){
			isFinished = true;
			result = value;
		},
		function(error){
			isFinished = true;
			isError = true;
			result = error;
		});
		while(!isFinished){
			queue.processNextEvent(true);
		}
		if(isError){
			throw result;
		}
		return result;
	}
	else{
		return target;
	}
};



/**
 * Takes an array of promises and returns a promise that is fulfilled once all
 * the promises in the array are fulfilled
 * @param array	The array of promises
 * @return the promise that is fulfilled when all the array is fulfilled, resolved to the array of results
 */
exports.all = function(array){
	var deferred = new Deferred();
	if(Object.prototype.toString.call(array) !== '[object Array]'){
		array = Array.prototype.slice.call(arguments);
	}
	var fulfilled = 0, length = array.length, rejected = false;
	var results = [];
	if (length === 0) deferred.resolve(results);
	else {
		array.forEach(function(promise, index){
			exports.when(promise,
				function(value){
					results[index] = value;
					fulfilled++;
					if(fulfilled === length){
						deferred.resolve(results);
					}
				},
				function(error){
					if(!rejected){
						 deferred.reject(error);
					}
					rejected = true;
				});
		});
	}
	return deferred.promise;
};

/**
 * Takes a hash of promises and returns a promise that is fulfilled once all
 * the promises in the hash keys are fulfilled
 * @param hash	The hash of promises
 * @return the promise that is fulfilled when all the hash keys is fulfilled, resolved to the hash of results
 */
exports.allKeys = function(hash){
	var deferred = new Deferred();
	var array = Object.keys(hash);
	var fulfilled = 0, length = array.length;
	var results = {};
	if (length === 0) deferred.resolve(results);
	else {
		array.forEach(function(key){
			exports.when(hash[key],
				function(value){
					results[key] = value;
					fulfilled++;
					if(fulfilled === length){
						deferred.resolve(results);
					}
				},
				deferred.reject);
		});
	}
	return deferred.promise;
};

/**
 * Takes an array of promises and returns a promise that is fulfilled when the first
 * promise in the array of promises is fulfilled
 * @param array	The array of promises
 * @return a promise that is fulfilled with the value of the value of first promise to be fulfilled
 */
exports.first = function(array){
	var deferred = new Deferred();
	if(Object.prototype.toString.call(array) !== '[object Array]'){
		array = Array.prototype.slice.call(arguments);
	}
	var fulfilled;
	array.forEach(function(promise, index){
		exports.when(promise, function(value){
			if (!fulfilled) {
				fulfilled = true;
				deferred.resolve(value);
			}
		},
		function(error){
			if (!fulfilled) {
				fulfilled = true;
				deferred.resolve(error);
			}
		});
	});
	return deferred.promise;
};

/**
 * Takes an array of asynchronous functions (that return promises) and
 * executes them sequentially. Each funtion is called with the return value of the last function
 * @param array	The array of function
 * @param startingValue The value to pass to the first function
 * @return the value returned from the last function
 */
exports.seq = function(array, startingValue){
	array = array.concat(); // make a copy
	var deferred = new Deferred();
	function next(value){
		var nextAction = array.shift();
		if(nextAction){
			exports.when(nextAction(value), next, function(error){
			  deferred.reject(error, true);
			});
		}
		else {
			deferred.resolve(value);
		}
	}
	next(startingValue);
	return deferred.promise;
};


/**
 * Delays for a given amount of time and then fulfills the returned promise.
 * @param milliseconds The number of milliseconds to delay
 * @return A promise that will be fulfilled after the delay
 */
if(typeof setTimeout !== "undefined") {
	exports.delay = function(milliseconds) {
		var deferred = new Deferred();
		setTimeout(function(){
			deferred.resolve();
		}, milliseconds);
		return deferred.promise;
	};
}



/**
 * Runs a function that takes a callback, but returns a Promise instead.
 * @param func	 node compatible async function which takes a callback as its last argument
 * @return promise for the return value from the callback from the function
 */
exports.execute = function(asyncFunction){
	var args = Array.prototype.slice.call(arguments, 1);

	var deferred = new Deferred();
	args.push(function(error, result){
		if(error) {
			deferred.emitError(error);
		}
		else {
			if(arguments.length > 2){
				// if there are multiple success values, we return an array
				Array.prototype.shift.call(arguments, 1);
				deferred.emitSuccess(arguments);
			}
			else{
				deferred.emitSuccess(result);
			}
		}
	});
	asyncFunction.apply(this, args);
	return deferred.promise;
};

function isGeneratorFunction(obj){
	return obj && obj.constructor && 'GeneratorFunction' == obj.constructor.name;
}

/**
 * Promise-based coroutine trampoline
 * Adapted from https://github.com/deanlandolt/copromise/blob/master/copromise.js
 */
function run(coroutine){
	var deferred = defer();
	(function next(value, exception) {
		var result;
		try {
			result = exception ? coroutine.throw(value) : coroutine.next(value);
		}
		catch (error) {
			return deferred.reject(error);
		}
		if (result.done) return deferred.resolve(result.value);
		exports.when(result.value, next, function(error) {
			next(error, true);
		});
	})();
	return deferred.promise;
};

/**
 * Creates a task from a coroutine, provided as generator. The `yield` function can be provided
 * a promise (or any value) to wait on, and the value will be provided when the promise resolves.
 * @param coroutine	 generator or generator function to treat as a coroutine
 * @return promise for the return value from the coroutine
 */
exports.spawn = function(coroutine){
	if (isGeneratorFunction(coroutine)) {
		coroutine = coroutine();
	}
	return run(coroutine);
}

/**
 * Converts a Node async function to a promise returning function
 * @param func	 node compatible async function which takes a callback as its last argument
 * @return A function that returns a promise
 */
exports.convertNodeAsyncFunction = function(asyncFunction, callbackNotDeclared){
	var arity = asyncFunction.length;
	return function(){
		var deferred = new Deferred();
		if(callbackNotDeclared){
			arity = arguments.length + 1;
		}
		arguments.length = arity;
		arguments[arity - 1] = function(error, result){
			if(error) {
				deferred.emitError(error);
			}
			else {
				if(arguments.length > 2){
					// if there are multiple success values, we return an array
					Array.prototype.shift.call(arguments, 1);
					deferred.emitSuccess(arguments);
				}
				else{
					deferred.emitSuccess(result);
				}
			}
		};
		asyncFunction.apply(this, arguments);
		return deferred.promise;
	};
};

/**
 * Returns a promise. If the object is already a Promise it is returned; otherwise
 * the object is wrapped in a Promise.
 * @param value	 The value to be treated as a Promise
 * @return A promise wrapping the original value
 */
exports.as = function(value){
	if (value instanceof Promise) {
		return value;
	} else {
		var ret = defer();
		ret.resolve(value);
		return ret;
	}
};
}.call(exports, __webpack_require__, exports, module),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
})(__webpack_require__(6));


/***/ }),
/* 6 */
/***/ (function(module, exports) {

module.exports = function() {
	throw new Error("define cannot be used indirect");
};


/***/ })
/******/ ]);
//# sourceMappingURL=rql.js.map