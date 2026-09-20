const config = require('../config');
const { getHaversineDistance } = require('../utils/geo');

/**
 * Resuelve un tramo de caminata inteligente y sin desvíos absurdos.
 * @param {Array<number>} startPt - [lng, lat]
 * @param {Array<number>} endPt - [lng, lat]
 * @param {object} [options] - Opciones adicionales (timeoutMs)
 * @returns {Promise<{ path: Array<Array<number>>, distance: number, duration: number }>}
 */
async function resolveWalkingLeg(startPt, endPt, options = {}) {
  if (!startPt || !endPt) {
    return { path: [], distance: 0, duration: 0 };
  }

  const euclideanDist = getHaversineDistance(startPt, endPt);

  // 1. Proximidad inmediata (< 15 metros): Ya está en el punto
  if (euclideanDist < 15) {
    return {
      path: [],
      distance: 0,
      duration: 0
    };
  }

  // 2. Caminata corta urbana (< 80 metros): Conexión directa y limpia
  if (euclideanDist < 80) {
    const dist = euclideanDist * 1.08;
    return {
      path: [startPt, endPt],
      distance: dist,
      duration: dist / 1.39 // 5 km/h (~1.39 m/s)
    };
  }

  // 3. Caminata media o larga (>= 80 metros): Consultar OSRM con filtro anti-desvíos
  const timeoutMs = options.timeoutMs || 3500;
  try {
    const url = `${config.osrmBaseUrl}/route/v1/walking/${startPt[0]},${startPt[1]};${endPt[0]},${endPt[1]}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (resp.ok) {
      const data = await resp.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const osrmDist = route.distance;
        const detourRatio = osrmDist / euclideanDist;

        // Si la ruta de OSRM es natural (ratio <= 1.45), usamos su trazado de calles
        if (detourRatio <= 1.45) {
          return {
            path: route.geometry.coordinates,
            distance: route.distance,
            duration: route.duration
          };
        } else {
          if (config.nodeEnv !== 'test') {
            console.log(
              `[Anti-Desvío] OSRM generó desvío excesivo: ${osrmDist.toFixed(0)}m vs ${euclideanDist.toFixed(0)}m directa (Ratio: ${detourRatio.toFixed(2)}x > 1.45). Usando trayecto directo limpio.`
            );
          }
        }
      }
    }
  } catch (err) {
    if (config.nodeEnv !== 'test') {
      console.warn('[OSRM Walking]', err.message);
    }
  }

  // Fallback limpio con factor de malla urbana realista
  const dist = euclideanDist * 1.18;
  return {
    path: [startPt, endPt],
    distance: dist,
    duration: dist / 1.39
  };
}

module.exports = {
  resolveWalkingLeg
};
