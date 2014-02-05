'use strict';

var app = angular.module('musicTastesApp');


app.factory('AuthFactory', ['Facebook','$q', function(Facebook, $q){
    return{
        loggedIn : false,
        accessToken : null,

        login: function(options){
            var that = this,
                deferred = $q.defer();

            if (this.loggedIn === true)
                return deferred.resolve('connected');

            Facebook.login(function(response) {
                if (response.status == 'connected'){
                    that.loggedIn = true;
                    that.accessToken = response.authResponse.accessToken;
                    deferred.resolve(response.status);
                }
                else{
                    deferred.reject(response.status);
                }
            }, options);
            return deferred.promise;
        },

        logout: function(){
            var that = this,
                d = $q.defer();
            Facebook.logout(function() {
                that.loggedIn = false;
                d.resolve('Logout Successful');
            });
            return d.promise;
        }
    };
}]);

app.controller('authenticationCtrl', [
        '$scope',
        '$timeout',
        '$q',
        'Facebook',
        'AuthFactory',

        function($scope, $timeout, $q, Facebook, AuthFactory) {

            // Define user empty data :/
            $scope.auth = {
                logged: false,
            };
            $scope.user = {};
            $scope.top10 = [null,null,null,null,null,null,null,null,null,null];
            $scope.percentDone = 0;

            // Defining user logged status
            $scope.top10Calculated = false;

            // And some fancy flags to display messages upon user status change
            $scope.byebye = false;
            $scope.salutation = false;

            /**
             * Watch for Facebook to be ready.
             * There's also the event that could be used
             */
            $scope.$watch(
                function() {
                    return Facebook.isReady();
                },
                function(newVal) {
                    if (newVal)
                        $scope.facebookReady = true;
                }
            );


            /**
             * Login
             */
            $scope.login = function() {
                if (!AuthFactory.loggedIn){
                    AuthFactory.login({
                        scope: 'user_likes,user_friends,friends_likes'
                    }).then(function(){ // Success
                            $scope.auth.logged = true;
                            $scope.me();
                        },
                        function(status){ // Fail
                            alert("Failed to login with status: " + status);
                        });
                }
            };

            /**
             * Logout
             */
            $scope.logout = function() {
                AuthFactory.logout().then(function(){
                    $scope.auth.logged = false;
                    $scope.user   = {};
                });
            };



            /**
             * me
             */
            $scope.me = function() {
                Facebook.api('/me', function(response) {
                    /**
                     * Using $scope.$apply since this happens outside angular framework.
                     */
                    $scope.$apply(function() {
                        $scope.user = response;
                    });

                });
            };




            $scope.getMyLikes = function () {
                Facebook.api('/me/music?limit=200', function(response){
                    $scope.$apply(function(){
                        $scope.myMusic = {};
                        var data = response.data;

                        for (var i=0;i<data.length; i++){
                            var curArtist = data[i];
                            $scope.myMusic[curArtist.id] = {name: curArtist.name}

                        }

                        $scope.myMusicFetched = true;
                    });
                });
            };


            var setMusicData = function (key) {
                Facebook.api('/'+key+'/music?limit=200',function(response){
                    var data = response.data;
                    var common = $scope.friends[key].common;
                    for (var i= 0; i < data.length; i++) {
                        var artist = data[i];
                        // If we share interest in artist, add to common
                        if ($scope.myMusic[artist.id]){
                            common.push([artist.id,artist.name]);
                        }
                    }
                    for (var j=0;j<10;j++){
                        if ($scope.top10[j] === null || common.length > $scope.top10[j].common.length) {
                            $scope.top10[j] = {
                                friend_id: key,
                                friend_name: $scope.friends[key].name,
                                friend_pic: $scope.friends[key].pic,
                                common: common
                            };
                            break;
                        }
                    }
                });
            }
            // Get list of all friends with non-empty music likes
            //SELECT uid,name FROM user WHERE uid in (SELECT uid1 from friend WHERE uid2 = me()) AND music <> ""

            // Get list of all music my friends like
            //   SELECT page_id, name FROM page WHERE page_id IN (
            // SELECT page_id FROM page_fan WHERE uid in (SELECT uid1 from friend WHERE uid2 = me()) AND profile_section="music")
            $scope.getFriendsLikes = function () {
                $scope.getMyLikes();
                Facebook.api({
                        method: 'fql.query',
                        query: 'SELECT uid,name, pic_square FROM user WHERE uid in (SELECT uid1 from friend WHERE uid2 = me()) AND music <> "" LIMIT 100'
                    },
                    function(response){
                        $scope.$apply(function(){
                            $scope.friends = {};
                            // Get all my friends in an id -> name hash
                            $scope.numFriends = response.length;
                            for (var i=0;i<response.length -1; i++){
                                var curFriend = response[i];
                                $scope.friends[curFriend.uid] = {
                                    name: curFriend.name,
                                    pic: curFriend.pic_square,
                                    common: [] }
                            }

                            // Find Friend's likes
                            var index = 1;
                            for (var key in $scope.friends) {
                                setMusicData(key);
                                $scope.percentDone = (100*index++)/$scope.numFriends;
                            }
                            $scope.top10Calculated = true;

                        });
                    });
            };
            /**
             * Taking approach of Events :D
             */
            $scope.$on('Facebook:statusChange', function(ev, data) {
                console.log('Status: ', data);
                if (data.status == 'connected') {
                    $scope.$apply(function() {
                        $scope.salutation = true;
                        $scope.byebye     = false;
                    });
                } else {
                    $scope.$apply(function() {
                        $scope.salutation = false;
                        $scope.byebye     = true;

                        // Dismiss byebye message after two seconds
                        $timeout(function() {
                            $scope.byebye = false;
                        }, 2000)
                    });
                }


            });


        }
    ])

/**
 * Just for debugging purposes.
 * Shows objects in a pretty way
 */
    .directive('debug', function() {
        return {
            restrict: 'E',
            scope: {
                expression: '=val'
            },
            template: '<pre>{{debug(expression)}}</pre>',
            link: function(scope) {
                // pretty-prints
                scope.debug = function(exp) {
                    return angular.toJson(exp, true);
                };
            }
        }
    });