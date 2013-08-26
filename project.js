angular.module('project', ['firebase']).value('fbURL', 'https://coollbase.firebaseio.com/').
   factory('Files', function (angularFireCollection, fbURL) {
   return angularFireCollection(fbURL);
}).config(function ($routeProvider) {
   $routeProvider.when('/', {
      controller : ListCtrl,
      templateUrl : 'list.html'
   }).when('/edit/:fileId', {
      controller : EditCtrl,
      templateUrl : 'detail.html'
   }).when('/new', {
      controller : CreateCtrl,
      templateUrl : 'detail.html'
   }).otherwise({
      redirectTo : '/'
   });
});

function ListCtrl ($scope, Files, fbURL, angularFire, $timeout, angularFireCollection) {
   $scope.files = Files;
   $scope.population = true;
   
   $scope.$watchCollection('files', function() {
      if ($scope.files.length > 0) {
         var file = $scope.files[0];
         $scope.fileId = file.$id;
         $scope.fileContentsRef = new Firebase(fbURL + file.$id + "/lines/");
         if ($scope.population) {
            $scope.addHandler = function(snapshot) {
               console.log("Added line index (**): " + $scope.updatedLineIdx);
   
               if ($scope.updatedLineIdx === undefined) {
                  // initial population
                  if (!$scope.lines) {
                     $scope.lines = [];
                  }         
                  $scope.lines.push(snapshot.val());
                  console.log("Push: " + snapshot.val().i + " " + snapshot.val().v);
               }
            };
            $scope.fileContentsRef.on('child_added', $scope.addHandler);

            $scope.fileContentsRef.on('child_changed', function(snapshot) {
               console.log("Changed line index (**): " + $scope.updatedLineIdx);
   
               if ($scope.updatedLineIdx !== undefined) {
                  // if we update a line and update is initiated locally
                  // then we update only lines except line updated locally
                  // in order to prevent loss of focus on that line
                  var i = snapshot.val().i;
                  console.log("i: " + i);
                  if ($scope.updatedLineIdx !== i) {
                     var line = _.findWhere($scope.lines, {"i": i});
                     line.v = snapshot.val().v;
                     console.log("Update: " + i + " " + line.v);
                  } 
               } 
            });
         }
      }
   });
   
   $scope.onLineFocus = function (lineIdx) {
      if ($scope.population) {
         $scope.fileContentsRef.off('child_added', $scope.addHandler);
         $scope.population = false;
      }
      
      console.log("onLineFocus (1): " + lineIdx);
   };

   $scope.updateRemote = _.debounce(function (line, lineIdx) {
      $scope.$apply(function() {
         console.log("Remote update called for " + lineIdx);
         console.log(line.v);
         $scope.updatedLineIdx = lineIdx;
         
         console.log("Updated line index: " + $scope.updatedLineIdx);
         
         var fileContentsRef = new Firebase(fbURL + $scope.fileId + "/lines/" + lineIdx);
         fileContentsRef.set({'v' : line.v, 'i' : lineIdx});
      });
   }, 2000, {
      leading : false
   });

   $scope.onLineChange = function (line, lineIndex) {
      console.log("onLineChange: " + lineIndex);
      $scope.updateRemote(line, lineIndex);
   }
}

function CreateCtrl ($scope, $location, $timeout, $q, Files) {
   fileSelect.setup($scope);

   $scope.save = function () {
      $scope.setFileContents($q).then(function () {
         Files.add($scope.file, function () {
            $timeout(function () {
               $location.path('/');
            });
         });
      });
   };

   $scope.setFileContents = function ($q) {
      var deferred = $q.defer();

      var f = $scope.fileContents;
      if (f.type.match('text.*')) {
         var reader = new FileReader ();

         // Closure to capture the file information.
         reader.onload = (function (theFile) {
            return function (e) {
               $scope.$apply(function () {

                  var rawLines = e.target.result.split("\n");
                  var lines = [];
                  angular.forEach(rawLines, function (rawLine, index) {
                     this.push({
                        "i" : index,
                        "v" : rawLine
                     });
                  }, lines);
                  $scope.file.lines = lines;

                  deferred.resolve();
               });
            };
         })(f);

         reader.readAsText(f);
      }
      return deferred.promise;
   };
}

function EditCtrl ($scope, $location, $routeParams, angularFire, fbURL) {
   angularFire(fbURL + $routeParams.fileId, $scope, 'remote', {}).then(function () {
      $scope.file = angular.copy($scope.remote);
      $scope.file.$id = $routeParams.fileId;
      $scope.isClean = function () {
         return angular.equals($scope.remote, $scope.file);
      }
      $scope.destroy = function () {
         $scope.remote = null;
         $location.path('/');
      };
      $scope.save = function () {
         $scope.remote = angular.copy($scope.file);
         $location.path('/');
      };
   });
}