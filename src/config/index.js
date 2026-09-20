const path = require('path');

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  osrmBaseUrl: process.env.OSRM_BASE_URL || 'https://router.project-osrm.org',
  routesDataDir: process.env.ROUTES_DATA_DIR || path.join(__dirname, '../../../MiRutaTunja-Front/assets/routes'),
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || '',
  mapboxToken: process.env.MAPBOX_TOKEN || ''
};

module.exports = config;
