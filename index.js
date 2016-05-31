const velvet = require('velvet');
const tasks = require('./tasks');
const plugins = require('./plugins');

const init = function (gulp, options) {
  options.velvet = options.velvet || velvet.loadEnv(options);

  for (const task in tasks) {
    tasks[task](gulp, options);
  }

  if (options.deployer === 'aws') {
    gulp.task('deployer', ['deployer-aws']);
  }

  if (options.deployer === 'ftp') {
    gulp.task('deployer', ['deployer-ftp']);
  }
};

module.exports = init;
module.exports.tasks = tasks;
module.exports.plugins = plugins;
