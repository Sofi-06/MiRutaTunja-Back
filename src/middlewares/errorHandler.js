const config = require('../config');

/**
 * Middleware centralizado para manejo de errores de Express
 */
function errorHandler(err, req, res, next) {
  if (config.nodeEnv !== 'test') {
    console.error('[Error Handler]', err);
  }

  const statusCode = err.status || err.statusCode || 500;
  const response = {
    error: err.message || 'Internal server error'
  };

  if (config.nodeEnv !== 'production' && err.stack) {
    response.details = err.message;
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = {
  errorHandler
};
