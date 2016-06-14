'use strict';

const path = require('path');
const gutil = require('gulp-util');
const watch = require('gulp-watch');

const PRIVATE = '**/_*/**';
const MODULES = 'node_modules/**/*';
const PACKAGE = 'package.json';

module.exports = function (gulp, options) {
  const runSequence = require('run-sequence').use(gulp);
  const velvet = options.velvet;
  const site = velvet.getGlobal('site');
  const config = velvet.getGlobal('config');

  gulp.task('watch', cb => {
    gutil.env.watching = true;

    const reset = function () {
      velvet.resetCache();
      site.reset();
    };

    const mdExt = config['markdown_ext'].split(',');
    const htmlExt = config['html_ext'].split(',');
    const scriptsExt = config['scripts_ext'].split(',');
    const stylesExt = config['styles_ext'].split(',');
    const imagesExt = config['images_ext'].split(',');

    const docExt = [].concat(mdExt).concat(htmlExt).join('|');

    watch([
      `${config.source}/**/*.+(${docExt})`,
      `${config.source}/_templates/**/*.+(${docExt})`,
      `!${PRIVATE}`,
      `!${MODULES}`,
      `!${PACKAGE}`
    ], () => {
      reset();
      runSequence('documents', 'styles', 'scripts', 'images');
    });

    watch(`${config.source}/_templates/**/*.+(html|nunjucks|njk)`, () => {
      reset();
      runSequence('documents', 'styles', 'scripts', 'images');
    });

    watch(`${config['data_dir']}/**/*`, () => {
      reset();
      runSequence('documents', 'styles', 'scripts', 'images');
    });

    const jsExt = scriptsExt.join('|');

    watch([
      `${config['scripts_dir']}/**/*.+(${jsExt})`,
      `!${MODULES}`,
      `!${PACKAGE}`
    ], () => {
      runSequence('scripts');
    });

    const cssExt = stylesExt.join('|');

    watch([
      `${config['styles_dir']}/**/*.+(${cssExt})`,
      `!${MODULES}`,
      `!${PACKAGE}`
    ], () => {
      runSequence('styles');
    });

    const imgExt = imagesExt.join('|');

    watch(`${config['images_dir']}/**/*.+(${imgExt})`, () => {
      runSequence('images');
    });

    const spritesDir = path.join(config.source, config['sprites_dir']);
    watch(`${spritesDir}/**/*.+(svg)`, () => {
      runSequence('sprites');
    });

    const exceptExt = [].concat(mdExt)
      .concat(htmlExt)
      .concat(scriptsExt)
      .concat(stylesExt)
      .concat(imagesExt)
      .join('|');

    watch([
      `${config.source}/**/*.!(${exceptExt})`,
      `!${PRIVATE}`,
      `!${MODULES}`,
      `!${PACKAGE}`
    ], () => {
      runSequence('files');
    });

    cb();
  });
};
