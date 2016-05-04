'use strict';

const path = require('path');
const through = require('through2');
const File = require('vinyl');
const gutil = require('gulp-util');
const PluginError = gutil.PluginError;

const PLUGIN_NAME = 'velvet-init';

const init = function (options) {
  options = options || {};

  let site;

  if (options.env && options.env.getGlobal) {
    site = options.env.getGlobal('site');
  } else if (options.site) {
    site = options.site;
  }

  if (!site.getObject) {
    return new PluginError(PLUGIN_NAME, 'You must provide a valid Velvet object');
  }

  const transform = function (file, enc, cb) {
    if (file.isStream()) {
      return cb(new PluginError(PLUGIN_NAME, 'Streaming not supported'));
    }

    const filepath = options.filepath || path.resolve(file.base, file.path);

    const obj = site.getObject(filepath);

    if (obj) {
      file.velvetObj = obj;
      file.destination = obj.destination;
      file.revision = obj.revision;

      if (obj.variants) {
        for (const key in obj.variants) {
          const variant = obj.variants[key];

          const newFile = new File({
            contents: file.contents,
            path: file.path,
            base: file.base
          });

          newFile.velvetObj = variant;
          newFile.destination = variant.destination;
          newFile.revision = variant.revision;

          this.push(newFile);
        }
      }
    }

    cb(null, file);
  };

  return through.obj(transform);
};

module.exports = init;