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
const uglify = require('gulp-uglify');
const sourcemaps = require('gulp-sourcemaps');
const through = require('through2');
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

const DEVELOPMENT_DEFAULTS = {
  cache: true,
  debug: true,
  devtool: 'source-map'
};

const DEVELOPMENT_PLUGIN_DEFAULTS = [
  new webpack.NoErrorsPlugin(),
  new webpack.DefinePlugin({'__DEV__': true})
];

const PRODUCTION_DEFAULTS = {
  cache: false,
  debug: false,
  devtool: false
};

const PRODUCTION_PLUGIN_DEFAULTS = [
  new webpack.DefinePlugin({
    'process.env.NODE_ENV': '\'production\'',
    '__DEV__': false
  }),
  new webpack.optimize.AggressiveMergingPlugin()
];

const getConfigFile = function (dir, type) {
  let filename = 'webpack.config.js';

  if (type) {
    filename = `webpack.${type}.config.js`;
  }

  try {
    const filepath = path.join(dir, filename);
    fs.accessSync(filepath, fs.F_OK);
    return filepath;
  } catch (e) {
    return false;
  }
};

const getConfig = function (scriptsDir, options) {
  let config;

  const configPathDefault = getConfigFile(scriptsDir);

  if (options.production) {
    const configPath = getConfigFile(scriptsDir, 'production');
    config = require(configPath || configPathDefault);
    config.plugins = config.plugins || [];

    if (!configPath) {
      Object.assign(config, PRODUCTION_DEFAULTS);
      config.plugins = config.plugins.concat(PRODUCTION_PLUGIN_DEFAULTS);
    }
  } else {
    const configPath = getConfigFile(scriptsDir, 'development');
    config = require(configPath || configPathDefault);
    config.plugins = config.plugins || [];

    if (!configPath) {
      Object.assign(config, DEVELOPMENT_DEFAULTS);
      config.plugins = config.plugins.concat(DEVELOPMENT_PLUGIN_DEFAULTS);
    }
  }

  return config;
};

module.exports = function (gulp, options) {
  const runSequence = require('run-sequence').use(gulp);
  const velvet = options.velvet;
  const site = velvet.getGlobal('site');
  const config = velvet.getGlobal('config');
  const environment = velvet.getGlobal('environment');

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
    const production = environment === 'production';
    const watching = gutil.env.watching;
    const errorHandler = notify.onError();

    const buildDir = config.build;
    const scriptsDir = config['scripts_dir'];

    const webpackConfig = getConfig(scriptsDir, {production});

    const scripts = site.scripts.filter(script => script.bundle);
    const compress = get(config, 'scripts.minify.settings') || MINIFY_DEFAULTS;

    const tasks = [];

    for (const script of scripts) {
      const webpackConfigCopy = clonedeep(webpackConfig);

      webpackConfigCopy.output = {path: buildDir, filename: script.destination};

      tasks.push(gulp.src(script.path, {cwd: scriptsDir, base: scriptsDir})
        .pipe(gulpIf(watching, plumber({errorHandler})))
        .pipe(webpackStream(webpackConfigCopy, webpack))
        .pipe(gulpIf(!production, sourcemaps.init({loadMaps: true})))
        .pipe(through.obj(function (file, enc, cb) {
          // Dont pipe through any source map files as it will be handled
          // by gulp-sourcemaps
          const isSourceMap = /\.map$/.test(file.path);
          if (!isSourceMap) {
            this.push(file);
          }
          cb();
        }))
        .pipe(plugins.init({velvet, filepath: script.filepath}))
        .pipe(gulpIf(script.minify, uglify({compress})))
        .pipe(gulpIf(script.revision, plugins.hash()))
        .pipe(plugins.destination())
        .pipe(gulpIf(!production, sourcemaps.write('.'))));
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
