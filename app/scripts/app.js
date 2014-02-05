'use strict';

angular.module('musicTastesApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'ui.bootstrap',
  'facebook'
])
  .config(['FacebookProvider', '$routeProvider' ,function (FacebookProvider, $routeProvider) {
    $routeProvider
      // .when('/', {
      //   templateUrl: 'views/main.html',
      //   controller: 'MainCtrl'
      // })
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'authenticationCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });

      FacebookProvider.init('335721413209152');
  }]);
