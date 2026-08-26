const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
  R26: 'rutas/Ruta 26-1.json',
};

// Registro de coordenadas por ruta
const routesRegistry = {};

const addCoords = (target, source) => {
  for (const pt of source) {
    if (target.length === 0) {
      target.push(pt);
    } else {
      const last = target[target.length - 1];
      if (last[0] !== pt[0] || last[1] !== pt[1]) {
        target.push(pt);
      }
    }
  }
};

// Cargar todas las rutas al iniciar el servidor
const loadAllRoutes = () => {
  try {
    const assetsDir = path.join(__dirname, '../MiRutaTunja-Front/assets/routes');
    if (fs.existsSync(assetsDir)) {
      for (const [key, relPath] of Object.entries(routesConfig)) {
        const fullPath = path.join(assetsDir, relPath);
        if (fs.existsSync(fullPath)) {
          const geojson = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          let routeIda = [];
          let routeVuelta = [];
          
          geojson.features.forEach(feature => {
            if (feature.geometry && feature.geometry.type === 'LineString') {
              const stroke = feature.properties?.stroke?.toLowerCase();
              const coords = feature.geometry.coordinates;
              
              if (stroke === '#7cb342' || stroke === '#0288d1') {
                addCoords(routeIda, coords);
              } else if (stroke === '#ffcc80' || stroke === '#fada80' || stroke === '#e65100') {
                addCoords(routeVuelta, coords);
              } else {
                addCoords(routeIda, coords);
              }
            }
          });
          
          routesRegistry[key] = {
            ida: routeIda,
            vuelta: routeVuelta
          };
        }
      }
      console.log(`[Rutas Cargadas] Total: ${Object.keys(routesRegistry).length} rutas en el registro.`);
    } else {
      console.warn(`[Warning] No se encontró la carpeta de assets de rutas en: ${assetsDir}`);
    }
  } catch (err) {
    console.error('Error cargando los archivos GeoJSON de las rutas:', err);
  }
};

loadAllRoutes();

// Fórmula de Haversine para calcular distancias reales en metros
function getHaversineDistance(coords1, coords2) {
  const lon1 = coords1[0];
  const lat1 = coords1[1];
  const lon2 = coords2[0];
  const lat2 = coords2[1];
  
  const R = 6371000; // Radio de la Tierra en metros
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Encontrar la coordenada más cercana en una lista de puntos
function findClosestPoint(targetPt, coordsList) {
  let minDistance = Infinity;
  let closestIndex = -1;
  for (let i = 0; i < coordsList.length; i++) {
    const dist = getHaversineDistance(targetPt, coordsList[i]);
    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = i;
    }
  }
  return closestIndex;
}

// Endpoint POST /routes
app.post('/routes', async (req, res) => {
  try {
    const { origin, destination, routeCode } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }

    if (
      typeof origin.lat !== 'number' || typeof origin.lng !== 'number' ||
      typeof destination.lat !== 'number' || typeof destination.lng !== 'number'
    ) {
      return res.status(400).json({ error: 'Coordinates must be valid numbers' });
    }

    // Normalizar la ruta pedida (ej: "R-01" -> "R1")
    let targetKey = 'R1';
    if (routeCode && typeof routeCode === 'string') {
      const match = routeCode.match(/R-?0*(\d+)/i);
      if (match) {
        targetKey = `R${match[1]}`;
      } else {
        targetKey = routeCode;
      }
    }

    const routeData = routesRegistry[targetKey] || routesRegistry['R1'];
    const coordsIda = routeData ? routeData.ida : [];
    const coordsVuelta = routeData ? routeData.vuelta : [];

    let bestDirection = null;
    let bestOnIdx = -1;
    let bestOffIdx = -1;
    let minWalkDist = Infinity;

    const originPt = [origin.lng, origin.lat];
    const destPt = [destination.lng, destination.lat];

    // Evaluar sentido Ida
    if (coordsIda.length > 0) {
      const idxOn = findClosestPoint(originPt, coordsIda);
      const idxOff = findClosestPoint(destPt, coordsIda);
      if (idxOff > idxOn) {
        const walkDist = getHaversineDistance(originPt, coordsIda[idxOn]) + 
                         getHaversineDistance(destPt, coordsIda[idxOff]);
        if (walkDist < minWalkDist) {
          minWalkDist = walkDist;
          bestDirection = 'ida';
          bestOnIdx = idxOn;
          bestOffIdx = idxOff;
        }
      }
    }

    // Evaluar sentido Vuelta
    if (coordsVuelta.length > 0) {
      const idxOn = findClosestPoint(originPt, coordsVuelta);
      const idxOff = findClosestPoint(destPt, coordsVuelta);
      if (idxOff > idxOn) {
        const walkDist = getHaversineDistance(originPt, coordsVuelta[idxOn]) + 
                         getHaversineDistance(destPt, coordsVuelta[idxOff]);
        if (walkDist < minWalkDist) {
          minWalkDist = walkDist;
          bestDirection = 'vuelta';
          bestOnIdx = idxOn;
          bestOffIdx = idxOff;
        }
      }
    }

    // Si encontramos una conexión válida construimos el trayecto multimodal
    if (bestDirection) {
      const activeCoords = bestDirection === 'ida' ? coordsIda : coordsVuelta;
      const P_on = activeCoords[bestOnIdx];
      const P_off = activeCoords[bestOffIdx];
      
      // Tramo B (Ruta en Bus)
      const busCoords = activeCoords.slice(bestOnIdx, bestOffIdx + 1);
      
      let distB = 0;
      for (let i = 0; i < busCoords.length - 1; i++) {
        distB += getHaversineDistance(busCoords[i], busCoords[i + 1]);
      }
      const durB = distB / 6.94; // 25 km/h en m/s

      // OSRM a pie para Tramo A (Caminata de Origen) y Tramo C (Caminata de Destino)
      const urlA = `https://router.project-osrm.org/route/v1/walking/${origin.lng},${origin.lat};${P_on[0]},${P_on[1]}?overview=full&geometries=geojson`;
      const urlC = `https://router.project-osrm.org/route/v1/walking/${P_off[0]},${P_off[1]};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

      const [resA, resC] = await Promise.all([
        fetch(urlA).then(r => r.json()).catch(() => null),
        fetch(urlC).then(r => r.json()).catch(() => null)
      ]);

      let pathA = [originPt, P_on];
      let distA = getHaversineDistance(originPt, P_on);
      let durA = distA / 1.39; // 5 km/h en m/s

      // Si la distancia a pie del origen es menor a 15 metros, no hay tramo de caminata inicial (se alinea exacto)
      if (distA < 15) {
        pathA = [];
        distA = 0;
        durA = 0;
      } else {
        if (resA && resA.routes && resA.routes.length > 0) {
          pathA = resA.routes[0].geometry.coordinates;
          distA = resA.routes[0].distance;
          durA = resA.routes[0].duration;
        }
      }

      let pathC = [P_off, destPt];
      let distC = getHaversineDistance(P_off, destPt);
      let durC = distC / 1.39;

      // Si la distancia a pie del destino es menor a 15 metros, no hay tramo de caminata final (se alinea exacto)
      if (distC < 15) {
        pathC = [];
        distC = 0;
        durC = 0;
      } else {
        if (resC && resC.routes && resC.routes.length > 0) {
          pathC = resC.routes[0].geometry.coordinates;
          distC = resC.routes[0].distance;
          durC = resC.routes[0].duration;
        }
      }

      const totalDistance = distA + distB + distC;
      const totalDuration = durA + durB + durC;
      const combinedRoute = [...pathA, ...busCoords, ...pathC];

      console.log(`[Multimodal Route (${targetKey})] Direction: ${bestDirection}. Origin Walk: ${distA.toFixed(1)}m, Bus: ${distB.toFixed(1)}m, Dest Walk: ${distC.toFixed(1)}m`);

      return res.json({
        isMultimodal: true,
        distance: totalDistance,
        duration: totalDuration,
        route: combinedRoute,
        tramoA: pathA,
        tramoB: busCoords,
        tramoC: pathC,
        details: {
          walkDistanceOrigin: distA,
          walkDurationOrigin: durA,
          busDistance: distB,
          busDuration: durB,
          walkDistanceDest: distC,
          walkDurationDest: durC,
          direction: bestDirection,
          routeCode: targetKey
        }
      });
    } else {
      // Fallback a caminata directa
      const coordinatesStr = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
      const osrmUrl = `https://router.project-osrm.org/route/v1/walking/${coordinatesStr}?overview=full&geometries=geojson`;

      console.log(`No bus connection found for ${targetKey}. Fallback to direct walk via OSRM: ${osrmUrl}`);
      const response = await fetch(osrmUrl);
      
      if (!response.ok) {
        throw new Error(`OSRM API responded with status ${response.status}`);
      }

      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        return res.status(404).json({ error: 'No route found' });
      }

      const routeData = data.routes[0];

      return res.json({
        isMultimodal: false,
        distance: routeData.distance,
        duration: routeData.duration,
        route: routeData.geometry.coordinates
      });
    }

  } catch (error) {
    console.error('Error calculating route:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Mi Ruta Tunja Backend running on port ${PORT}`);
  });
}

module.exports = app;

