const velvet = require('velvet');
const plugins = require('./plugins');

const init = function (gulp, options) {
  options.velvet = options.velvet || velvet.loadEnv(options);

  require('./tasks/browser-sync')(gulp, options);
  require('./tasks/clean')(gulp, options);
  require('./tasks/generate')(gulp, options);
  require('./tasks/copy')(gulp, options);
  require('./tasks/documents')(gulp, options);
  require('./tasks/files')(gulp, options);
  require('./tasks/images')(gulp, options);
  require('./tasks/release')(gulp, options);
  require('./tasks/scripts')(gulp, options);
  require('./tasks/sprites')(gulp, options);
  require('./tasks/styles')(gulp, options);
  require('./tasks/watch')(gulp, options);

  if (options.deployer === 'aws') {
    require('./tasks/deployer/aws')(gulp, options);
    gulp.task('deployer', ['deployer-aws']);
  }

  if (options.deployer === 'ftp') {
    require('./tasks/deployer/ftp')(gulp, options);
    gulp.task('deployer', ['deployer-ftp']);
  }
};

module.exports = init;
module.exports.plugins = plugins;
