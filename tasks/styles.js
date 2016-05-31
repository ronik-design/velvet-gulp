'use strict';

const path = require('path');
const fs = require('fs');
const url = require('url');
const plumber = require('gulp-plumber');
const gutil = require('gulp-util');
const sourcemaps = require('gulp-sourcemaps');
const notify = require('gulp-notify');
const size = require('gulp-size');
const gulpIf = require('gulp-if');
const merge = require('merge-stream');
const clone = require('lodash.clone');
const plugins = require('../plugins');

const sass = require('gulp-sass');
const nodeSass = require('node-sass');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const stylelint = require('stylelint');
const syntaxScss = require('postcss-scss');
const reporter = require('postcss-reporter');
const objectFitImages = require('postcss-object-fit-images');
const qs = require('qs');

const errorHandler = notify.onError();

const getFileUrl = function (site) {
  return function (relpath) {
    const parsed = url.parse(relpath);
    const file = site.getFile(parsed.pathname);

    if (file) {
      file.output = true;
      return `${file.url}${parsed.search || ''}${parsed.hash || ''}`;
    }

    return relpath;
  };
};

const getImageUrl = function (site) {
  return function (relpath, filters) {
    const parsed = url.parse(relpath);
    filters = filters || {};

    if (typeof filters === 'string') {
      filters = qs.parse(filters);
    }

    const image = site.getImage(parsed.pathname);

    if (!image) {
      return relpath;
    }

    let imageUrl = image.url;

    if (Object.keys(filters).length > 0) {
      imageUrl = image.addVariant(filters).url;
    } else {
      image.output = true;
    }

    return `${imageUrl}${parsed.search || ''}${parsed.hash || ''}`;
  };
};

/* eslint-disable */

const sassImporter = null;

/* eslint-enable */

const sassFunction = function (site) {
  return {
    'image-url($path: "", $width: 0, $height: 0, $crop: "", $grayscale: false, $quality: 0, $max: false, $rotate: false, $sharpen: false)'(imagePath, width, height, crop, grayscale, quality, max, rotate, sharpen) {
      const filters = {};

      if (width.getValue()) {
        filters.resize = filters.resize || [];
        filters.resize[0] = width.getValue();
      }

      if (height.getValue()) {
        filters.resize = filters.resize || [];
        filters.resize[1] = height.getValue();
      }

      if (crop.getValue()) {
        filters.crop = crop.getValue();
      }

      if (grayscale.getValue()) {
        filters.grayscale = grayscale.getValue();
      }

      if (quality.getValue()) {
        filters.quality = quality.getValue();
      }

      if (max.getValue()) {
        filters.max = max.getValue();
      }

      if (sharpen.getValue()) {
        filters.sharpen = sharpen.getValue();
      }

      if (rotate.getValue()) {
        filters.rotate = rotate.getValue();
      }

      const imageUrl = getImageUrl(site)(imagePath.getValue(), filters);

      return new nodeSass.types.String(`url('${imageUrl}')`);
    },
    'file-url($path: "")'(filePath) {
      const fileUrl = getFileUrl(site)(filePath.getValue());
      return new nodeSass.types.String(`url('${fileUrl}')`);
    }
  };
};

const loadPostcssPlugins = function (options) {
  const plugins = [];

  for (const plugin of options.plugins) {
    let loaded;

    try {
      loaded = require(plugin.name);
    } catch (e) {
      gutil.log(gutil.colors.red(
        `PostCSS plugin '${plugin.name}' not found. Maybe you need to 'npm install' it?`
        )
      );
    }

    if (!plugin) {
      continue;
    }

    if (plugin.options) {
      loaded = loaded(plugin.options);
    }

    plugins.push(loaded);
  }

  return plugins;
};

const getStylelintConfigFile = function (dir) {
  try {
    const filepath = path.join(dir, '.stylelintrc');
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

  gulp.task('styles:lint', () => {
    const watching = gutil.env.watching;

    const stylesDir = config['styles_dir'];

    const configFile = getStylelintConfigFile(stylesDir);

    if (!configFile) {
      return gulp.src('.').pipe(gutil.log('No .stylelintrc present... skipping'));
    }

    const processors = [
      stylelint({configFile}),
      reporter({clearMessages: true, throwError: true})
    ];

    return gulp.src(path.join(stylesDir, '/**/*.{sass,scss}'))
      .pipe(gulpIf(watching, plumber({errorHandler})))
      .pipe(postcss(processors, {syntax: syntaxScss}));
  });

  gulp.task('styles:build', () => {
    const production = gutil.env.production;
    const watching = gutil.env.watching;

    const buildDir = config.build;
    const srcDir = config['styles_dir'];
    const srcOpts = {cwd: srcDir, base: srcDir};

    const sassConfig = {
      importer: sassImporter,
      functions: sassFunction
    };

    let postcssProcessors = [
      objectFitImages,
      autoprefixer({browsers: [config.styles.autoprefixer]})
    ];

    if (config.styles) {
      if (config.styles.sass) {
        Object.assign(sassConfig, config.styles.sass);
      }

      if (config.styles.postcss) {
        const plugins = loadPostcssPlugins(config.styles.postcss);
        postcssProcessors = postcssProcessors.concat(plugins);
      }
    }

    const styles = site.styles.filter(style => style.output);

    const tasks = [];

    for (const style of styles) {
      const processors = clone(postcssProcessors);

      if (style.minify) {
        processors.push(cssnano);
      }

      const task = gulp.src(style.path, srcOpts)
        .pipe(gulpIf(watching, plumber({errorHandler})))
        .pipe(plugins.init({velvet}))
        .pipe(gulpIf(!production, sourcemaps.init()))
        .pipe(sass(sassConfig).on('error', sass.logError))
        .pipe(postcss(processors))
        .pipe(plugins.destination())
        .pipe(gulpIf(!production, sourcemaps.write('./')));

      tasks.push(task);
    }

    if (!tasks.length) {
      return gulp.src('.').pipe(gutil.noop());
    }

    return merge(tasks)
      .pipe(size({title: 'styles'}))
      .pipe(gulp.dest(buildDir))
      .pipe(plugins.revisionManifest({base: buildDir, merge: true}))
      .pipe(gulp.dest(buildDir));
  });

  gulp.task('styles', cb => runSequence('styles:lint', 'styles:build', cb));
};
