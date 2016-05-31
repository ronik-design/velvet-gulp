'use strict';

const path = require('path');
const fs = require('fs');
const url = require('url');
const gutil = require('gulp-util');
const browserSync = require('browser-sync');

const DEFAULT_PORT = 4000;

const spaMiddleware = function (buildDir) {
  return function (req, res, next) {
    const requestPath = url.parse(req.url);
    const fileName = requestPath.href.split(requestPath.search).join('');
    const fileExists = fs.existsSync(path.join(buildDir, fileName));
    if (!fileExists && fileName.indexOf('browser-sync-client') < 0) {
      req.url = '/index.html';
    }
    return next();
  };
};

module.exports = function (gulp, options) {
  const config = options.velvet.getGlobal('config');

  gulp.task('browser-sync', () => {
    const buildDir = config.build;

    const host = gutil.env.host || 'localhost';
    const port = gutil.env.port || DEFAULT_PORT;

    const server = {
      baseDir: buildDir
    };

    if (config.spa) {
      server.middleware = spaMiddleware(buildDir);
    }

    browserSync({
      open: false,
      ghostMode: false,
      host,
      port,
      server,
      reloadDebounce: 2000,
      files: [{
        match: path.join(buildDir, '**/*.+(js|html|css)'),
        options: {
          ignoreInitial: true,
          awaitWriteFinish: true
        }
      }]
    });
  });
};
