'use strict';

const tasks = {};

tasks.browserSync = require('./browser-sync');
tasks.clean = require('./clean');
tasks.generate = require('./generate');
tasks.copy = require('./copy');
tasks.documents = require('./documents');
tasks.deployerAws = require('./deployer/aws');
tasks.files = require('./files');
tasks.images = require('./images');
tasks.release = require('./release');
tasks.scripts = require('./scripts');
tasks.sprites = require('./sprites');
tasks.styles = require('./styles');
tasks.watch = require('./watch');

module.exports = tasks;
