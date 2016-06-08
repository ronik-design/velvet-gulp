'use strict';

const plugins = {};

plugins.destination = require('./destination');
plugins.init = require('./init');
plugins.render = require('./render');
plugins.revisionManifest = require('./revision-manifest');
plugins.hash = require('./hash');

module.exports = plugins;
