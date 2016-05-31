'use strict';

const path = require('path');
const through = require('through2');
const nunjucks = require('nunjucks');
const File = require('vinyl');
const gulpUtil = require('gulp-util');
const PluginError = gulpUtil.PluginError;
const getHash = require('./utils/get-hash');
const relPath = require('./utils/rel-path');
const NodeCache = require('node-cache');
const templateCache = new NodeCache();

const PLUGIN_NAME = 'velvet-render';
const HASH_LENGTH = 12;

const errorHandler = function (error, file, cb) {
  let filepath = error.file === 'stdin' ? file.path : error.file;
  let message = '';

  filepath = filepath ? filepath : file.path;
  const relativePath = relPath(process.cwd(), filepath);

  message += `${gulpUtil.colors.underline(relativePath)}\n`;
  message += error.message ? error.message : error;

  error.messageFormatted = message;
  error.messageOriginal = error.message;
  error.message = gulpUtil.colors.stripColor(message);

  error.relativePath = relativePath;

  console.error(gulpUtil.colors.red(`[${PLUGIN_NAME}]`), error.messageFormatted);

  return cb(new PluginError(PLUGIN_NAME, error));
};

const render = function (filepath, context, options) {
  const page = context.page;
  const env = options.env;
  const cacheEnabled = options.cacheEnabled;

  const content = page.content;

  let contentHash;
  let template;
  let rendered;

  if (cacheEnabled) {
    contentHash = getHash(content, HASH_LENGTH);

    const cacheKey = `${filepath}:${contentHash}`;
    template = templateCache.get(cacheKey);

    if (!template) {
      template = nunjucks.compile(content, env);
      templateCache.set(cacheKey, template);
    }
  } else {
    template = nunjucks.compile(content, env);
  }

  rendered = template.render(context);

  if (page.placeInLayout) {
    const layout = env.getTemplate(`layouts/${page.layout}.html`, true);
    context.content = rendered;
    rendered = layout.render(context);
  }

  return rendered;
};

const renderVariant = (file, variant, options) => {
  let rendered;

  const context = {page: variant};

  return variant.triggerHooks('preRender', context)
    .then(() => {
      rendered = render(file.path, context, options);
      return variant.triggerHooks('postRender', rendered);
    })
    .then(() => {
      options.transform.push(new File({
        contents: new Buffer(rendered),
        path: path.join(file.base, variant.destination),
        base: file.base
      }));
    });
};

const gulpRender = function (options) {
  options = options || {};

  const velvet = options.velvet;
  const cacheEnabled = !options.noCache;

  const transform = function (file, enc, cb) {
    if (file.isNull()) {
      return cb(null, file);
    }

    if (file.isStream()) {
      return cb(new PluginError(PLUGIN_NAME, 'Streaming not supported'));
    }

    if (!file.velvetObj) {
      return cb(null, file);
    }

    const doc = file.velvetObj;

    if (!doc.output) {
      file = null;
      return cb(null, null);
    }

    if (!doc.renderWithNunjucks) {
      return cb(null, file);
    }

    let tasks = [];

    const opts = {
      env: velvet,
      cacheEnabled,
      transform: this
    };

    if (doc.variants) {
      tasks = doc.variants.map(variant => renderVariant(file, variant, opts));
    }

    tasks.push(renderVariant(file, doc, opts));

    Promise.all(tasks)
      .then(() => cb())
      .catch(err => errorHandler(err, file, cb));
  };

  return through.obj(transform);
};

module.exports = gulpRender;
