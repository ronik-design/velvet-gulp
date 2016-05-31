'use strict';

const gutil = require('gulp-util');
const gulpIf = require('gulp-if');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const size = require('gulp-size');
const cached = require('gulp-cached');
const plugins = require('../plugins');

const TASK_NAME = 'files';

const getFilePaths = function (site) {
  const filePaths = site.files.map(file => file.filepath);

  for (const label in site.collections) {
    const collection = site.collections[label];
    for (const file of collection.files) {
      filePaths.push(file.filepath);
    }
  }

  return filePaths;
};

module.exports = function (gulp, options) {
  const velvet = options.velvet;
  const site = velvet.getGlobal('site');
  const config = velvet.getGlobal('config');

  gulp.task('files', () => {
    const watching = gutil.env.watching;
    const errorHandler = notify.onError();

    const filePaths = getFilePaths(site);
    const buildDir = config.build;

    return gulp.src(filePaths, {base: config.source})
      .pipe(gulpIf(watching, plumber({errorHandler})))
      .pipe(cached(TASK_NAME))
      .pipe(plugins.init({velvet}))
      .pipe(plugins.destination())
      .pipe(size({title: TASK_NAME}))
      .pipe(gulp.dest(buildDir))
      .pipe(plugins.revisionManifest({base: buildDir, merge: true}))
      .pipe(gulp.dest(buildDir));
  });
};
