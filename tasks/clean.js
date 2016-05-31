'use strict';

const path = require('path');
const del = require('del');

module.exports = function (gulp, options) {
  const config = options.velvet.getGlobal('config');

  gulp.task('clean', cb => {
    const dirs = [
      path.join(config.build, '/**/*'),
      path.join(config.destination, '/**/*')
    ];

    del.sync(dirs);

    cb();
  });
};
