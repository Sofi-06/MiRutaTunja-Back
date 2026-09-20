const fs = require('fs');
const path = require('path');
const config = require('../config');
const { chainSegments } = require('../utils/geo');

const routesConfig = {
  R1: 'ruta 1/Ruta 1-1.json',
  R2: 'ruta 2/Ruta 2-1.json',
  R3: 'rutas/Ruta 3-1.json',
  R4: 'rutas/Ruta 4-1.json',
  R5: 'rutas/Ruta 5-2.json',
  R6: 'rutas/Ruta 6-1.json',
  R7: 'rutas/Ruta 7-1.json',
  R8: 'rutas/Ruta 8-1.json',
  R9: 'rutas/Ruta 9-1.json',
  R10: 'rutas/Ruta 10-1.json',
  R11: 'rutas/Ruta 11-1.json',
  R12: 'rutas/Ruta 12-1.json',
  R13: 'rutas/Ruta 13-1.json',
  R14: 'rutas/Ruta 14-1.json',
  R15: 'rutas/Ruta 15-1.json',
  R16: 'rutas/Ruta 16-1.json',
  R17: 'rutas/Ruta 17-1.json',
  R18: 'rutas/Ruta 18-1.json',
  R19: 'rutas/Ruta 19-1.json',
  R20: 'rutas/Ruta 20-1.json',
  R21: 'rutas/Ruta 21-1.json',
  R22: 'rutas/Ruta 22-2.json',
  R23: 'rutas/Ruta 23-1.json',
  R24: 'rutas/Ruta 24-1.json',
  R25: 'rutas/Ruta 25-1.json',
  R26: 'rutas/Ruta 26-1.json'
};

const routesRegistry = {};

/**
 * Carga y procesa todas las rutas GeoJSON en memoria.
 * @param {string} [customDir] - Directorio personalizado opcional de assets de rutas.
 * @returns {object} El registro de rutas cargadas.
 */
function loadAllRoutes(customDir) {
  try {
    const assetsDir = customDir || config.routesDataDir;
    if (fs.existsSync(assetsDir)) {
      for (const [key, relPath] of Object.entries(routesConfig)) {
        const fullPath = path.join(assetsDir, relPath);
        if (fs.existsSync(fullPath)) {
          const geojson = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          const segmentsIda = [];
          const segmentsVuelta = [];

          geojson.features.forEach((feature) => {
            if (feature.geometry && feature.geometry.type === 'LineString') {
              const stroke = feature.properties?.stroke?.toLowerCase();
              const coords = feature.geometry.coordinates;

              if (stroke === '#7cb342' || stroke === '#0288d1') {
                segmentsIda.push(coords);
              } else if (stroke === '#ffcc80' || stroke === '#fada80' || stroke === '#e65100') {
                segmentsVuelta.push(coords);
              } else {
                segmentsIda.push(coords);
              }
            }
          });

          routesRegistry[key] = {
            ida: chainSegments(segmentsIda),
            vuelta: chainSegments(segmentsVuelta)
          };
        }
      }
      if (config.nodeEnv !== 'test') {
        console.log(
          `[Rutas Cargadas] Total: ${Object.keys(routesRegistry).length} rutas en el registro con encadenamiento topológico.`
        );
      }
    } else {
      console.warn(`[Warning] No se encontró la carpeta de assets de rutas en: ${assetsDir}`);
    }
  } catch (err) {
    console.error('Error cargando los archivos GeoJSON de las rutas:', err);
  }

  return routesRegistry;
}

module.exports = {
  routesConfig,
  routesRegistry,
  loadAllRoutes
};
