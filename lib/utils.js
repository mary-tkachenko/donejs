var Q = require('q');
var path = require('path');
var npm = require('npm');
var exec = require('child_process').exec;
var yeoman = require('yeoman-environment');

// Returns a .then-able function that installs a single module
// if it is not available in the current path
var installIfMissing = exports.installIfMissing = function(root, module) {
  var location = module ? path.join(root, module) : root;
  if(!module) {
    module = root;
  }

  return function (previous) {
    try {
      require.resolve(location);
    } catch (e) {
      console.log('Installing ' + module);
      return Q.ninvoke(npm.commands, 'install', [module]).then(function () {
        return previous;
      });
    }

    return previous;
  };
};

// Run a command and pipe the output.
// The returned promise will reject if there is a non-zero exist status
var runCommand = exports.runCommand = function(cmd, args) {
  if(args && args.length) {
    cmd = cmd + ' ' + args.join(' ');
  }

  var child = exec(cmd, {
    cwd: process.cwd()
  });

  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);

  var deferred = Q.defer();

  child.on('exit', function(status) {
    if(status !== 0) {
      deferred.reject(new Error('Command `' + cmd + ' ' +
        (args || []).join(' ') + '` did not complete successfully'));
    } else {
      deferred.resolve(child);
    }
  });

  return deferred.promise;
};

// Run any of the Yeoman generators from the current generator-donejs
exports.generate = function(root, args) {
  return Q.ninvoke(npm, 'load', { loaded: false })
    .then(installIfMissing(root, 'generator-donejs'))
    .then(function () {
      var generators = require(path.join(root, 'generator-donejs'));
      var env = yeoman.createEnv();

      Object.keys(generators).forEach(function(name) {
          var fullName = path.join(root, 'generator-donejs', name);
          env.register(require.resolve(fullName), name);
      });

      return Q.npost(env, 'run', args);
    });
};

exports.runScript = function(name) {
  return runCommand('npm', ['run', name]);
};

// Log error messages and exit application
exports.log = function(promise) {
  return promise.then(function() {
    process.exit(0);
  }, function(error) {
    console.error(error.stack || error.message || error);
    process.exit(1);
  });
};