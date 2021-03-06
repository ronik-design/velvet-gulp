'use strict';

const path = require('path');
const url = require('url');
const gutil = require('gulp-util');
const gulpIf = require('gulp-if');
const ignore = require('gulp-ignore');
const awspublish = require('gulp-awspublish');
const s3Website = require('s3-website');
const notify = require('gulp-notify');
const mergeStream = require('merge-stream');
const parallelize = require('concurrent-transform');
const getManifest = require('../utils/get-manifest');
const cyan = gutil.colors.cyan;
const logName = `'${cyan('aws')}'`;

const MAX_CONCURRENCY = 5;

const REVISIONED_HEADERS = {
  'Cache-Control': 'max-age=315360000, no-transform, public'
};

const STATIC_HEADERS = {
  'Cache-Control': 'max-age=300, s-maxage=900, no-transform, public'
};

const getBucket = function (target, config) {
  if (config.deployer.bucket) {
    return config.deployer.bucket;
  }

  let deployUrl = config.url;

  if (target === 'staging' && config.staging_url) {
    deployUrl = config.staging_url;
  }

  return url.parse(deployUrl).hostname;
};

module.exports = function (gulp, options) {
  const runSequence = require('run-sequence').use(gulp);
  const site = options.velvet.getGlobal('site');
  const config = options.velvet.getGlobal('config');

  let deployHost;

  gulp.task('aws:config', cb => {
    const target = gutil.env.target || 'staging';

    const bucket = getBucket(target, config);

    const s3Config = {
      domain: bucket,
      index: 'index.html',
      error: site.config.error
    };

    if (config['single_page']) {
      s3Config.routes = [{
        Condition: {
          HttpErrorCodeReturnedEquals: '404'
        },
        Redirect: {
          ReplaceKeyWith: 'index.html'
        }
      }];
    }

    s3Website(s3Config, (err, website) => {
      if (err) {
        return cb(err);
      }

      deployHost = website.url;

      if (website && website.modified) {
        gutil.log(logName, 'Site config updated');
      }

      cb(err);
    });
  });

  gulp.task('aws:publish', cb => {
    const force = gutil.env.force;
    const target = gutil.env.target || 'staging';

    const bucket = getBucket(target, config);

    if (!bucket) {
      return cb();
    }

    const deployDir = config.destination;

    const publisher = awspublish.create({
      params: {
        Bucket: bucket
      }
    });

    const publisherOpts = {force};

    const revManifest = getManifest(deployDir);

    const merged = mergeStream();

    if (revManifest.length) {
      const revPaths = revManifest.map(p => path.join(deployDir, p));

      merged.add(
        gulp.src(revPaths, {base: deployDir})
          .pipe(ignore.include('**/*.{html,js,css,txt}'))
          .pipe(awspublish.gzip())
          .pipe(parallelize(publisher.publish(REVISIONED_HEADERS, publisherOpts), MAX_CONCURRENCY))
      );

      merged.add(
        gulp.src(revPaths, {base: deployDir})
          .pipe(ignore.exclude('**/*.{html,js,css,txt}'))
          .pipe(parallelize(publisher.publish(REVISIONED_HEADERS, publisherOpts), MAX_CONCURRENCY))
      );
    }

    merged.add(
      gulp.src(path.join(deployDir, '**/*.+(html|js|css|txt)'))
        .pipe(gulpIf(revManifest.length, ignore.exclude(revManifest)))
        .pipe(awspublish.gzip())
        .pipe(parallelize(publisher.publish(STATIC_HEADERS, publisherOpts), MAX_CONCURRENCY))
    );

    merged.add(
      gulp.src(path.join(deployDir, '/**/*.!(html|js|css|txt)'))
        .pipe(gulpIf(revManifest.length, ignore.exclude(revManifest)))
        .pipe(parallelize(publisher.publish(STATIC_HEADERS, publisherOpts), MAX_CONCURRENCY))
    );

    let synced = merged.pipe(publisher.sync());

    if (!gutil.env.hasOwnProperty('awspublish-cache') || gutil.env['awspublish-cache'] === true) { // eslint-disable-line
      synced = synced.pipe(publisher.cache());
    }

    return synced.pipe(awspublish.reporter());
  });

  gulp.task('deployer-aws', cb => {
    runSequence('aws:config', 'aws:publish', err => {
      if (err) {
        gutil.log(gutil.colors.red(`Your deploy failed!`));
        notify.onError()(err);
      } else {
        gutil.log('');
        gutil.log(`Your site has been deployed to AWS`);
        gutil.log('----------------------------------');
        gutil.log(gutil.colors.green(deployHost));
        gutil.log('');
      }

      cb(err);
    });
  });
};
