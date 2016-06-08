'use strict';

const path = require('path');

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

module.exports = getManifest;
