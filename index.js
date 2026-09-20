const app = require('./src/app');
const config = require('./src/config');
const { loadAllRoutes } = require('./src/data/routeRegistry');

// Cargar el registro de rutas GeoJSON al iniciar el servidor
loadAllRoutes();

if (config.nodeEnv !== 'test') {
  app.listen(config.port, () => {
    console.log(`Mi Ruta Tunja Backend running on port ${config.port}`);
  });
}

module.exports = app;
