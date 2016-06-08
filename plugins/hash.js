'use strict';

const through = require('through2');
const gutil = require('gulp-util');
const crypto = require('crypto');

const PluginError = gutil.PluginError;

const PLUGIN_NAME = 'velvet-hash';

const destination = function (opts) {
  opts = opts || {};

  const transform = function (file, enc, cb) {
    if (file.isNull()) {
      return cb(null, file);
    }

    if (file.isStream()) {
      return cb(new PluginError(PLUGIN_NAME, 'Streaming not supported'));
    }

    if (!file.destination) {
      return cb(null, file);
    }

    // Add a standard vinyl hash
    file.hash = crypto.createHash('md5').update(file.contents).digest('hex');

    if (file.velvetObj) {
      // Update the hash
      file.velvetObj.hash = file.hash;

      if (file.destination) {
        // Update the destination
        file.originalDestination = file.destination;
        file.destination = file.velvetObj.destination;
      }
    }

    cb(null, file);
  };

  return through.obj(transform);
};

module.exports = destination;
