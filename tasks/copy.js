'use strict';

const htmlmin = require('gulp-htmlmin');
const get = require('lodash.get');
const gulpIf = require('gulp-if');
const path = require('path');

const DEFAULTS = {
  collapseWhitespace: true,
  preserveLineBreaks: false,
  conservativeCollapse: false,
  removeComments: false,
  removeTagWhitespace: false,
  useShortDoctype: true,
  removeEmptyAttributes: true,
  keepClosingSlash: true,
  quoteCharacter: `'`
};

module.exports = function (gulp, options) {
  const site = options.velvet.getGlobal('site');
  const environment = options.velvet.getGlobal('environment');
  const config = site.config;

  gulp.task('copy:html', () => {
    const minifyEnvs = get(config, 'html.minify.envs') || [];
    const minify = minifyEnvs.indexOf(environment) > -1;
    const htmlminConfig = get(config, 'html.minify.settings') || DEFAULTS;

    return gulp.src(path.join(config.build, '/**/*.html'))
      .pipe(gulpIf(minify, htmlmin(htmlminConfig)))
      .pipe(gulp.dest(config.destination));
  });

  gulp.task('copy:files', () => {
    const buildDir = config.build;
    const destDir = config.destination;

    return gulp.src(path.join(buildDir, '/**/*.!(html)'), {dot: true})
      .pipe(gulp.dest(destDir));
  });

  gulp.task('copy', ['copy:html', 'copy:files']);
};
