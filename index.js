'use strict';

const render = require('./lib/render');
const init = require('./lib/init');
const destination = require('./lib/destination');
const revisionManifest = require('./lib/revision-manifest');

module.exports = function (velvet) {
  return {
    init: init(velvet),
    destination,
    revisionManifest,
    render: render(velvet)
  };
};
