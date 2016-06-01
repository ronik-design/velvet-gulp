'use strict';

const path = require('path');
const url = require('url');
const gutil = require('gulp-util');
const gulpIf = require('gulp-if');
const ignore = require('gulp-ignore');
const awspublish = require('gulp-awspublish');
const s3Website = require('s3-website');
const notify = require('gulp-notify');
const merge = require('merge-stream');
const parallelize = require('concurrent-transform');
const cyan = gutil.colors.cyan;
const logName = `'${cyan('aws')}'`;

const MAX_CONCURRENCY = 5;

const REVISIONED_HEADERS = {
  'Cache-Control': 'max-age=315360000, no-transform, public'
};

const STATIC_HEADERS = {
  'Cache-Control': 'max-age=300, s-maxage=900, no-transform, public'
};

const getManifest = function (dirname, filename) {
  let manifest;

  try {
    const revManifest = require(path.join(dirname, filename || 'revision-manifest.json'));
    manifest = Object.keys(revManifest).map(p => revManifest[p]);
  } catch (e) {
    manifest = [];
  }

  return manifest;
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

    if (config.spa) {
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

      deployHost = website;

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

    let gzipRevisioned = gutil.noop();
    let plainRevisioned = gutil.noop();

    if (revManifest.length) {
      const revPaths = revManifest.map(p => path.join(deployDir, p));

      gzipRevisioned = gulp.src(revPaths, {base: deployDir})
        .pipe(ignore.include('**/*.{html,js,css,txt}'))
        .pipe(awspublish.gzip())
        .pipe(parallelize(publisher.publish(REVISIONED_HEADERS, publisherOpts), MAX_CONCURRENCY));

      plainRevisioned = gulp.src(revPaths, {base: deployDir})
        .pipe(ignore.exclude('**/*.{html,js,css,txt}'))
        .pipe(parallelize(publisher.publish(REVISIONED_HEADERS, publisherOpts), MAX_CONCURRENCY));
    }

    const gzipStatic = gulp.src(path.join(deployDir, '**/*.+(html|js|css|txt)'))
      .pipe(gulpIf(revManifest.length, ignore.exclude(revManifest)))
      .pipe(awspublish.gzip())
      .pipe(parallelize(publisher.publish(STATIC_HEADERS, publisherOpts), MAX_CONCURRENCY));

    const plainStatic = gulp.src(path.join(deployDir, '/**/*.!(html|js|css|txt)'))
      .pipe(gulpIf(revManifest.length, ignore.exclude(revManifest)))
      .pipe(parallelize(publisher.publish(STATIC_HEADERS, publisherOpts), MAX_CONCURRENCY));

    return merge(gzipRevisioned, gzipStatic, plainRevisioned, plainStatic)
      .pipe(publisher.sync())
      .pipe(publisher.cache())
      .pipe(awspublish.reporter());
  });

  gulp.task('deployer-aws', cb => {
    runSequence('aws:config', 'aws:publish', err => {
      if (err) {
        gutil.log(gutil.colors.red(`Your deploy failed!`));
        gutil.log(err.message);
      } else {
        gutil.log(`Your site has been deployed to AWS`);
        gutil.log('----------------------------------');
        gutil.log(gutil.colors.green(deployHost));
      }

      notify.onError()(err);
      cb(err);
    });
  });
};
