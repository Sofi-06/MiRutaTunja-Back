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

// Encadenar tramos para formar un trazado topológicamente continuo
function chainSegments(segments) {
  if (!segments || segments.length === 0) return [];
  if (segments.length === 1) return segments[0];

  const pool = segments.map(seg => [...seg]);
  let result = pool.shift();

  while (pool.length > 0) {
    const tail = result[result.length - 1];
    let bestIdx = -1;
    let bestDist = Infinity;
    let shouldReverse = false;

    for (let i = 0; i < pool.length; i++) {
      const seg = pool[i];
      const headDist = getHaversineDistance(tail, seg[0]);
      const tailDist = getHaversineDistance(tail, seg[seg.length - 1]);

      if (headDist < bestDist) {
        bestDist = headDist;
        bestIdx = i;
        shouldReverse = false;
      }
      if (tailDist < bestDist) {
        bestDist = tailDist;
        bestIdx = i;
        shouldReverse = true;
      }
    }

    if (bestIdx !== -1 && bestDist < 1200) {
      const nextSeg = pool.splice(bestIdx, 1)[0];
      if (shouldReverse) nextSeg.reverse();
      addCoords(result, nextSeg);
    } else {
      // Si el tramo más cercano está aislado, simplemente agregarlo
      const nextSeg = pool.shift();
      addCoords(result, nextSeg);
    }
  }

  return result;
}

// Cargar todas las rutas al iniciar el servidor
const loadAllRoutes = () => {
  try {
    const assetsDir = path.join(__dirname, '../MiRutaTunja-Front/assets/routes');
    if (fs.existsSync(assetsDir)) {
      for (const [key, relPath] of Object.entries(routesConfig)) {
        const fullPath = path.join(assetsDir, relPath);
        if (fs.existsSync(fullPath)) {
          const geojson = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          let segmentsIda = [];
          let segmentsVuelta = [];
          
          geojson.features.forEach(feature => {
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
      console.log(`[Rutas Cargadas] Total: ${Object.keys(routesRegistry).length} rutas en el registro con encadenamiento topológico.`);
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
  if (!coords1 || !coords2) return Infinity;
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

// Proyectar un punto ortogonalmente sobre un segmento de línea [a, b]
function projectPointOnSegment(p, a, b) {
  if (!p || !a || !b) return { point: a || [0, 0], distance: Infinity, t: 0 };

  const latMid = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const cosLat = Math.cos(latMid);

  // Vector AB en metros aproximados en el plano local
  const dx = (b[0] - a[0]) * 111320 * cosLat;
  const dy = (b[1] - a[1]) * 110540;
  const segLenSq = dx * dx + dy * dy;

  if (segLenSq < 0.0001) {
    return {
      point: [a[0], a[1]],
      distance: getHaversineDistance(p, a),
      t: 0
    };
  }

  // Vector AP en metros
  const px = (p[0] - a[0]) * 111320 * cosLat;
  const py = (p[1] - a[1]) * 110540;

  let t = (px * dx + py * dy) / segLenSq;
  t = Math.max(0, Math.min(1, t));

  const projLon = a[0] + t * (b[0] - a[0]);
  const projLat = a[1] + t * (b[1] - a[1]);
  const projPt = [projLon, projLat];

  return {
    point: projPt,
    distance: getHaversineDistance(p, projPt),
    t: t
  };
}

// Resolver tramo de caminata inteligente y sin desvíos absurdos
async function resolveWalkingLeg(startPt, endPt) {
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
  // Evita desvíos absurdos causados por falta de cruces peatonales en OSM
  if (euclideanDist < 80) {
    const dist = euclideanDist * 1.08;
    return {
      path: [startPt, endPt],
      distance: dist,
      duration: dist / 1.39 // 5 km/h (~1.39 m/s)
    };
  }

  // 3. Caminata media o larga (>= 80 metros): Consultar OSRM con filtro anti-desvíos
  try {
    const url = `https://router.project-osrm.org/route/v1/walking/${startPt[0]},${startPt[1]};${endPt[0]},${endPt[1]}?overview=full&geometries=geojson`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
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
          console.log(`[Anti-Desvío] OSRM generó desvío excesivo: ${osrmDist.toFixed(0)}m vs ${euclideanDist.toFixed(0)}m directa (Ratio: ${detourRatio.toFixed(2)}x > 1.45). Usando trayecto directo limpio.`);
        }
      }
    }
  } catch (err) {
    console.warn('[OSRM Walking]', err.message);
  }

  // Fallback limpio con factor de malla urbana realista
  const dist = euclideanDist * 1.18;
  return {
    path: [startPt, endPt],
    distance: dist,
    duration: dist / 1.39
  };
}

// Encontrar el mejor par de subida y bajada proyectando sobre los segmentos continuos de la ruta
function findBestBoardingAndDropoff(originPt, destPt, coordsList) {
  const numPts = coordsList ? coordsList.length : 0;
  if (numPts < 2) return null;

  // Precalcular distancias acumuladas de los vértices
  const cumDists = [0];
  for (let k = 0; k < numPts - 1; k++) {
    cumDists.push(cumDists[k] + getHaversineDistance(coordsList[k], coordsList[k + 1]));
  }

  // Proyectar Origen sobre cada segmento de la ruta
  const origProjections = [];
  for (let k = 0; k < numPts - 1; k++) {
    const proj = projectPointOnSegment(originPt, coordsList[k], coordsList[k + 1]);
    const distAlongRoute = cumDists[k] + getHaversineDistance(coordsList[k], proj.point);
    origProjections.push({
      segIdx: k,
      point: proj.point,
      walkDist: proj.distance,
      distAlongRoute: distAlongRoute,
      t: proj.t
    });
  }

  // Proyectar Destino sobre cada segmento de la ruta
  const destProjections = [];
  for (let k = 0; k < numPts - 1; k++) {
    const proj = projectPointOnSegment(destPt, coordsList[k], coordsList[k + 1]);
    const distAlongRoute = cumDists[k] + getHaversineDistance(coordsList[k], proj.point);
    destProjections.push({
      segIdx: k,
      point: proj.point,
      walkDist: proj.distance,
      distAlongRoute: distAlongRoute,
      t: proj.t
    });
  }

  let minScore = Infinity;
  let bestCandidate = null;

  for (let i = 0; i < origProjections.length; i++) {
    const on = origProjections[i];
    if (on.walkDist > 2200) continue;

    for (let j = 0; j < destProjections.length; j++) {
      const off = destProjections[j];
      if (off.walkDist > 2200) continue;

      // El punto de bajada debe ocurrir después del punto de subida en el sentido del bus
      const busDist = off.distAlongRoute - on.distAlongRoute;
      if (busDist < 50) continue; // Descartar micro-tramos en bus menores a 50m

      // Función de optimización:
      // - Prioridad máxima a minimizar caminata de origen y destino (peso 2.0x)
      // - Minimizar vueltas y desvíos excesivos en bus (peso 0.08x)
      const score = (on.walkDist * 2.0) + (off.walkDist * 2.0) + (busDist * 0.08);

      if (score < minScore) {
        minScore = score;
        bestCandidate = {
          on: on,
          off: off,
          busDist: busDist,
          score: score,
          walkOrigin: on.walkDist,
          walkDest: off.walkDist
        };
      }
    }
  }

  if (bestCandidate) {
    const on = bestCandidate.on;
    const off = bestCandidate.off;

    // Construir la polilínea exacta del bus desde la proyección de subida hasta la de bajada
    const rawBusCoords = [];
    rawBusCoords.push(on.point);

    if (on.segIdx === off.segIdx) {
      rawBusCoords.push(off.point);
    } else {
      for (let k = on.segIdx + 1; k <= off.segIdx; k++) {
        rawBusCoords.push(coordsList[k]);
      }
      rawBusCoords.push(off.point);
    }

    // Filtrar puntos duplicados o consecutivos ultra cercanos (< 0.5m)
    const cleanedBusCoords = [];
    for (const pt of rawBusCoords) {
      if (cleanedBusCoords.length === 0) {
        cleanedBusCoords.push(pt);
      } else {
        const last = cleanedBusCoords[cleanedBusCoords.length - 1];
        if (getHaversineDistance(last, pt) > 0.5) {
          cleanedBusCoords.push(pt);
        }
      }
    }

    return {
      boardingPoint: on.point,
      dropoffPoint: off.point,
      busCoords: cleanedBusCoords,
      busDist: bestCandidate.busDist,
      score: bestCandidate.score,
      walkOrigin: bestCandidate.walkOrigin,
      walkDest: bestCandidate.walkDest
    };
  }

  return null;
}

// Evaluar un código de ruta específico para origen y destino
function evaluateRouteForPoints(key, originPt, destPt) {
  const routeData = routesRegistry[key];
  if (!routeData) return null;
  const coordsIda = routeData.ida || [];
  const coordsVuelta = routeData.vuelta || [];

  const candidateOptions = [];

  if (coordsIda.length >= 2) {
    const bestIda = findBestBoardingAndDropoff(originPt, destPt, coordsIda);
    if (bestIda) {
      candidateOptions.push({
        direction: 'ida',
        routeKey: key,
        ...bestIda
      });
    }
  }

  if (coordsVuelta.length >= 2) {
    const bestVuelta = findBestBoardingAndDropoff(originPt, destPt, coordsVuelta);
    if (bestVuelta) {
      candidateOptions.push({
        direction: 'vuelta',
        routeKey: key,
        ...bestVuelta
      });
    }
  }

  if (coordsIda.length > 0 && coordsVuelta.length > 0) {
    const continuousIdaVuelta = [...coordsIda, ...coordsVuelta];
    const bestContIdaVuelta = findBestBoardingAndDropoff(originPt, destPt, continuousIdaVuelta);
    if (bestContIdaVuelta) {
      candidateOptions.push({
        direction: 'circuito',
        routeKey: key,
        ...bestContIdaVuelta
      });
    }

    const continuousVueltaIda = [...coordsVuelta, ...coordsIda];
    const bestContVueltaIda = findBestBoardingAndDropoff(originPt, destPt, continuousVueltaIda);
    if (bestContVueltaIda) {
      candidateOptions.push({
        direction: 'circuito',
        routeKey: key,
        ...bestContVueltaIda
      });
    }
  }

  if (candidateOptions.length > 0) {
    candidateOptions.sort((a, b) => a.score - b.score);
    return candidateOptions[0];
  }
  return null;
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

    const originPt = [origin.lng, origin.lat];
    const destPt = [destination.lng, destination.lat];

    // Evaluar todas las rutas disponibles en la red de Tunja
    const allEvaluated = [];
    for (const key of Object.keys(routesRegistry)) {
      const evalRes = evaluateRouteForPoints(key, originPt, destPt);
      if (evalRes) {
        // Ponderación global:
        // Priorizar fuertemente minimizar la caminata en destino (1.8x) y origen (1.3x)
        const globalScore = (evalRes.walkOrigin * 1.3) + (evalRes.walkDest * 1.8) + (evalRes.busDist * 0.04);
        allEvaluated.push({
          ...evalRes,
          globalScore
        });
      }
    }

    allEvaluated.sort((a, b) => a.globalScore - b.globalScore);

    // Normalizar la ruta pedida (ej: "R-01" -> "R1", "R22", etc.)
    let requestedKey = null;
    if (routeCode && typeof routeCode === 'string' && routeCode !== 'PERS' && routeCode !== 'AUTO' && routeCode !== 'WALK') {
      const match = routeCode.match(/R-?0*(\d+)/i);
      if (match) {
        requestedKey = `R${match[1]}`;
      } else {
        requestedKey = routeCode;
      }
    }

    let bestOption = null;
    if (requestedKey && routesRegistry[requestedKey]) {
      // Si el usuario seleccionó explícitamente una ruta específica
      bestOption = evaluateRouteForPoints(requestedKey, originPt, destPt);
    }

    // Si no se solicitó una ruta específica o la ruta específica no conecta, tomamos la más eficiente de la ciudad
    if (!bestOption && allEvaluated.length > 0) {
      bestOption = allEvaluated[0];
    }

    const selectedRouteKey = bestOption ? bestOption.routeKey : (requestedKey || 'R1');

    if (bestOption) {
      const busCoords = bestOption.busCoords;
      const bestDirection = bestOption.direction;
      const P_on = bestOption.boardingPoint;
      const P_off = bestOption.dropoffPoint;
      
      let distB = 0;
      for (let i = 0; i < busCoords.length - 1; i++) {
        distB += getHaversineDistance(busCoords[i], busCoords[i + 1]);
      }
      const durB = distB / 6.94; // 25 km/h en m/s

      // Resolver tramos de caminata A y C de forma inteligente y sin desvíos
      const [legA, legC] = await Promise.all([
        resolveWalkingLeg(originPt, P_on),
        resolveWalkingLeg(P_off, destPt)
      ]);

      const pathA = legA.path;
      const distA = legA.distance;
      const durA = legA.duration;

      const pathC = legC.path;
      const distC = legC.distance;
      const durC = legC.duration;

      const totalDistance = distA + distB + distC;
      const totalDuration = durA + durB + durC;
      const combinedRoute = [...pathA, ...busCoords, ...pathC];

      console.log(`[Multimodal Route (${selectedRouteKey})] Direction: ${bestDirection}. Origin Walk: ${distA.toFixed(1)}m, Bus: ${distB.toFixed(1)}m, Dest Walk: ${distC.toFixed(1)}m`);

      return res.json({
        isMultimodal: true,
        distance: totalDistance,
        duration: totalDuration,
        route: combinedRoute,
        tramoA: pathA,
        tramoB: busCoords,
        tramoC: pathC,
        boardingPoint: P_on,
        dropoffPoint: P_off,
        selectedRouteKey: selectedRouteKey,
        alternatives: allEvaluated.slice(0, 5).map(item => ({
          routeKey: item.routeKey,
          direction: item.direction,
          walkOrigin: item.walkOrigin,
          walkDest: item.walkDest,
          busDist: item.busDist
        })),
        details: {
          walkDistanceOrigin: distA,
          walkDurationOrigin: durA,
          busDistance: distB,
          busDuration: durB,
          walkDistanceDest: distC,
          walkDurationDest: durC,
          direction: bestDirection,
          routeCode: selectedRouteKey,
          boardingPoint: P_on,
          dropoffPoint: P_off
        }
      });
    } else {
      // Fallback a caminata directa limpia
      const directWalk = await resolveWalkingLeg(originPt, destPt);
      const fallbackPath = directWalk.path.length > 0 ? directWalk.path : [originPt, destPt];

      return res.json({
        isMultimodal: false,
        distance: directWalk.distance,
        duration: directWalk.duration,
        route: fallbackPath
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

