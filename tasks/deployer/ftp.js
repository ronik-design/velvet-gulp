'use strict';

const gutil = require('gulp-util');
const ftp = require('vinyl-ftp');
const notify = require('gulp-notify');

const MAX_CONCURRENCY = 5;

module.exports = function (gulp, options) {
  const runSequence = require('run-sequence').use(gulp);
  const config = options.velvet.getGlobal('config');

  let deployHost;

  gulp.task('ftp:publish', () => {
    const deployConfig = config.deployer || {};

    const host = process.env.FTP_HOST || deployConfig.host;
    const directory = process.env.FTP_DIRECTORY || deployConfig.directory;
    const user = process.env.FTP_USER || deployConfig.user;
    const password = process.env.FTP_PASSWORD || deployConfig.password;

    deployHost = host;

    const conn = ftp.create({
      host,
      user,
      password,
      parallel: MAX_CONCURRENCY,
      log: gutil.log
    });

    return gulp.src('**/*', {base: config.destination, cwd: config.destination, dot: true, buffer: false})
      .pipe(conn.newer(directory))
      .pipe(conn.dest(directory));
  });

  gulp.task('deployer-ftp', cb => {
    runSequence('ftp:publish', err => {
      if (err) {
        gutil.log(gutil.colors.red(`Your deploy failed!`));
        notify.onError()(err);
      } else {
        gutil.log(`Your site has been deployed to FTP`);
        gutil.log('----------------------------------');
        gutil.log(gutil.colors.green(deployHost));
      }

      cb(err);
    });
  });
};
