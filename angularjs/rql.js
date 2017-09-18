/*global angular,window*/

(function withAngular(angular, window) {
  "use strict";

  var parserProvider = function parserProvider() {
    return require("../parser");
  };
  var queryProvider = function queryProvider() {
    return require("../query");
  };

  angular
    .module("rql", [])
    .factory("rqlParser", parserProvider)
    .factory("rqlQuery", queryProvider);
})(angular, window);
