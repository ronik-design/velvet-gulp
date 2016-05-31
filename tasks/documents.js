'use strict';

const gutil = require('gulp-util');
const gulpIf = require('gulp-if');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const size = require('gulp-size');
const plugins = require('../plugins');

const TASK_NAME = 'documents';

const getDocPaths = function (site) {
  const docPaths = [];

  for (const label in site.collections) {
    const collection = site.collections[label];
    for (const doc of collection.docs) {
      docPaths.push(doc.filepath);
    }
  }

  return docPaths;
};

module.exports = function (gulp, options) {
  const velvet = options.velvet;
  const site = velvet.getGlobal('site');
  const config = velvet.getGlobal('config');

  gulp.task('documents', () => {
    const watching = gutil.env.watching;
    const errorHandler = notify.onError();

    const docPaths = getDocPaths(site);

    return gulp.src(docPaths, {base: config.source})
      .pipe(gulpIf(watching, plumber({errorHandler})))
      .pipe(plugins.init({velvet}))
      .pipe(plugins.render({velvet}))
      .pipe(size({title: TASK_NAME}))
      .pipe(gulp.dest(config.build));
  });
};

