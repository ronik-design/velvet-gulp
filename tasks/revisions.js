'use strict';

const path = require('path');
const revReplace = require('gulp-rev-replace');
const gutil = require('gulp-util');
const getManifest = require('./utils/get-manifest');

module.exports = function (gulp, options) {
  const site = options.velvet.getGlobal('site');
  const config = site.config;

  gulp.task('revisions', () => {
    const manifestFilename = 'revision-manifest.json';

    const test = getManifest(config.build, manifestFilename);

    if (!test.length) {
      return gulp.src('.').pipe(gutil.noop());
    }

    const manifest = gulp.src(path.join(config.build, manifestFilename));

    return gulp.src(path.join(config.build, '**/*'))
      .pipe(revReplace({manifest}))
      .pipe(gulp.dest(config.build));
  });
};
