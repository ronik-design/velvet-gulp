'use strict';

const gulp = require('gulp');
const gutil = require('gulp-util');
const gulpIf = require('gulp-if');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const size = require('gulp-size');
const sharp = require('gulp-sharp');
const cached = require('gulp-cached');
const merge = require('merge-stream');
const through = require('through2');
const plugins = require('../plugins');

const TASK_NAME = 'images';

const imageTransform = function () {
  const transform = function (file, enc, done) {
    if (!file.velvetObj || !file.velvetObj.filters) {
      return done(null, file);
    }

    // Pipe into the sharp transform
    gulp.src(file.path, {read: false})
      .pipe(sharp(file.velvetObj.filters))
      .pipe(through.obj((f, e, cb) => {
        // Get the transformed or read file contents
        file.contents = f.contents;

        // return from parent transform
        done(null, file);

        // return from this
        cb();
      }))
      .on('error', done);
  };

  return through.obj(transform);
};

module.exports = function (gulp, options) {
  const velvet = options.velvet;
  const site = velvet.getGlobal('site');
  const config = velvet.getGlobal('config');

  gulp.task('images', () => {
    const watching = gutil.env.watching;
    const errorHandler = notify.onError();

    const srcDir = config['images_dir'];
    const buildDir = config.build;

    const images = site.images.filter(image => image.output);

    const tasks = images.map(image => {
      return gulp.src(image.path, {cwd: srcDir, base: srcDir})
        .pipe(gulpIf(watching, plumber({errorHandler})))
        .pipe(plugins.init({velvet}))
        .pipe(plugins.destination())
        .pipe(cached(TASK_NAME, {optimizeMemory: true}))
        .pipe(plugins.destination({restore: true}))
        .pipe(imageTransform())
        .pipe(plugins.destination());
    });

    if (!tasks.length) {
      return gulp.src('.').pipe(gutil.noop());
    }

    return merge(tasks)
      .pipe(size({title: TASK_NAME}))
      .pipe(gulp.dest(buildDir))
      .pipe(plugins.revisionManifest({base: buildDir, merge: true}))
      .pipe(gulp.dest(buildDir));
  });
};
