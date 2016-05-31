'use strict';

const htmlmin = require('gulp-htmlmin');
const path = require('path');

module.exports = function (gulp, options) {
  const site = options.velvet.getGlobal('site');
  const config = site.config;

  gulp.task('copy:htmlmin', () => {
    const buildDir = config.build;
    const destDir = config.destination;

    const htmlminConfig = {
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

    return gulp.src(path.join(buildDir, '/**/*.html'))
      .pipe(htmlmin(htmlminConfig))
      .pipe(gulp.dest(destDir));
  });

  gulp.task('copy:files', () => {
    const buildDir = config.build;
    const destDir = config.destination;

    return gulp.src(path.join(buildDir, '/**/*.!(html)'), {dot: true})
      .pipe(gulp.dest(destDir));
  });

  gulp.task('copy', ['copy:htmlmin', 'copy:files']);
};
