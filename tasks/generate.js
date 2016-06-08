'use strict';

module.exports = function (gulp) {
  const runSequence = require('run-sequence').use(gulp);

  gulp.task('generate', cb => {
    runSequence(
      'clean',
      ['documents', 'files', 'sprites'],
      ['scripts', 'styles'],
      'images',
      'revisions',
      cb);
  });
};
