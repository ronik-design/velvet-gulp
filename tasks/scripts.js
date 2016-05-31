'use strict';

const gutil = require('gulp-util');
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const notify = require('gulp-notify');
const plumber = require('gulp-plumber');
const gulpIf = require('gulp-if');
const merge = require('merge-stream');
const clonedeep = require('lodash.clonedeep');
const get = require('lodash.get');
const cached = require('gulp-cached');
const size = require('gulp-size');
const plugins = require('../plugins');

const TASK_NAME = 'scripts';

const MINIFY_DEFAULTS = {
  'screw_ie8': true,
  'properties': true,
  'dead_code': false,
  'unused': false,
  'drop_debugger': true,
  'warnings': true,
  'keep_fargs': true
};

const getConfig = function (scriptsDir, options) {
  let configPath;

  if (options.production) {
    configPath = path.join(scriptsDir, 'webpack.production.config.js');
  } else {
    configPath = path.join(scriptsDir, 'webpack.development.config.js');
  }

  return require(configPath);
};

const getEslintConfigFile = function (dir) {
  try {
    const filepath = path.join(dir, '.eslintrc');
    fs.accessSync(filepath, fs.F_OK);
    return filepath;
  } catch (e) {
    return false;
  }
};

module.exports = function (gulp, options) {
  const runSequence = require('run-sequence').use(gulp);
  const velvet = options.velvet;
  const site = velvet.getGlobal('site');
  const config = velvet.getGlobal('config');

  gulp.task('scripts:copy', () => {
    const watching = gutil.env.watching;
    const errorHandler = notify.onError();

    const scriptsDir = config['scripts_dir'];
    const buildDir = config.build;

    const scripts = site.scripts
      .filter(script => script.output && !script.bundle)
      .map(script => script.path);

    return gulp.src(scripts, {cwd: scriptsDir, base: scriptsDir})
      .pipe(gulpIf(watching, plumber({errorHandler})))
      .pipe(cached(TASK_NAME))
      .pipe(plugins.init({velvet}))
      .pipe(size({title: 'scripts:copy'}))
      .pipe(plugins.destination())
      .pipe(gulp.dest(buildDir))
      .pipe(plugins.revisionManifest({base: buildDir, merge: true}))
      .pipe(gulp.dest(buildDir));
  });

  gulp.task('scripts:bundle', () => {
    const production = gutil.env.production;
    const watching = gutil.env.watching;
    const errorHandler = notify.onError();

    const buildDir = config.build;
    const scriptsDir = config['scripts_dir'];

    const webpackConfig = getConfig(scriptsDir, {production});

    const configFile = getEslintConfigFile(scriptsDir);

    if (configFile) {
      webpackConfig.eslint = {configFile};
    }

    const scripts = site.scripts.filter(script => script.bundle);

    const tasks = [];

    for (const script of scripts) {
      const webpackConfigCopy = clonedeep(webpackConfig);
      webpackConfigCopy.output = {filename: script.destination};

      if (script.minify) {
        const minifySettings = get(config, 'scripts.minify.settings') || {};
        const uglifyOpts = {compress: Object.assign(MINIFY_DEFAULTS, minifySettings)};
        const uglify = new webpack.optimize.UglifyJsPlugin(uglifyOpts);
        webpackConfigCopy.plugins.push(uglify);
      }

      tasks.push(gulp.src(script.path, {cwd: scriptsDir, base: scriptsDir})
        .pipe(gulpIf(watching, plumber({errorHandler})))
        .pipe(plugins.init({velvet, filepath: script.filepath}))
        .pipe(webpackStream(webpackConfigCopy, webpack))
        .pipe(plugins.destination()));
    }

    if (!tasks.length) {
      return gulp.src('.').pipe(gutil.noop());
    }

    return merge(tasks)
      .pipe(size({title: TASK_NAME}))
      .pipe(gulp.dest(buildDir))
      .pipe(plugins.revisionManifest({base: buildDir, merge: true}))
      .pipe(gulp.dest(buildDir));
  });

  gulp.task('scripts', cb => runSequence('scripts:copy', 'scripts:bundle', cb));
};
