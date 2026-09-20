const { getHaversineDistance, projectPointOnSegment } = require('../utils/geo');
const { routesRegistry } = require('../data/routeRegistry');
const osrmService = require('./osrm.service');
const config = require('../config');

/**
 * Encuentra el mejor par de puntos de subida y bajada sobre los vértices continuos de una ruta.
 * @param {Array<number>} originPt - [lng, lat]
 * @param {Array<number>} destPt - [lng, lat]
 * @param {Array<Array<number>>} coordsList - Coordenadas de la ruta
 * @returns {object|null}
 */
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
      const score = on.walkDist * 2.0 + off.walkDist * 2.0 + busDist * 0.08;

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

/**
 * Evalúa una ruta específica para los puntos dados.
 * @param {string} key - Clave de ruta (ej. 'R1')
 * @param {Array<number>} originPt - [lng, lat]
 * @param {Array<number>} destPt - [lng, lat]
 * @returns {object|null}
 */
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

/**
 * Calcula la mejor ruta multimodal o directa entre origen y destino.
 * @param {object} params - { origin: { lat, lng }, destination: { lat, lng }, routeCode }
 * @returns {Promise<object>}
 */
async function calculateOptimalRoute({ origin, destination, routeCode }) {
  const originPt = [origin.lng, origin.lat];
  const destPt = [destination.lng, destination.lat];

  // Evaluar todas las rutas disponibles en la red de Tunja
  const allEvaluated = [];
  for (const key of Object.keys(routesRegistry)) {
    const evalRes = evaluateRouteForPoints(key, originPt, destPt);
    if (evalRes) {
      const globalScore = evalRes.walkOrigin * 1.3 + evalRes.walkDest * 1.8 + evalRes.busDist * 0.04;
      allEvaluated.push({
        ...evalRes,
        globalScore
      });
    }
  }

  allEvaluated.sort((a, b) => a.globalScore - b.globalScore);

  // Normalizar la ruta pedida (ej: "R-01" -> "R1", "R22", etc.)
  let requestedKey = null;
  if (
    routeCode &&
    typeof routeCode === 'string' &&
    routeCode !== 'PERS' &&
    routeCode !== 'AUTO' &&
    routeCode !== 'WALK'
  ) {
    const match = routeCode.match(/R-?0*(\d+)/i);
    if (match) {
      requestedKey = `R${match[1]}`;
    } else {
      requestedKey = routeCode;
    }
  }

  let bestOption = null;
  if (requestedKey && routesRegistry[requestedKey]) {
    bestOption = evaluateRouteForPoints(requestedKey, originPt, destPt);
  }

  if (!bestOption && allEvaluated.length > 0) {
    bestOption = allEvaluated[0];
  }

  const selectedRouteKey = bestOption ? bestOption.routeKey : requestedKey || 'R1';

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
      osrmService.resolveWalkingLeg(originPt, P_on),
      osrmService.resolveWalkingLeg(P_off, destPt)
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

    if (config.nodeEnv !== 'test') {
      console.log(
        `[Multimodal Route (${selectedRouteKey})] Direction: ${bestDirection}. Origin Walk: ${distA.toFixed(1)}m, Bus: ${distB.toFixed(1)}m, Dest Walk: ${distC.toFixed(1)}m`
      );
    }

    return {
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
      alternatives: allEvaluated.slice(0, 5).map((item) => ({
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
    };
  } else {
    // Fallback a caminata directa limpia
    const directWalk = await osrmService.resolveWalkingLeg(originPt, destPt);
    const fallbackPath = directWalk.path.length > 0 ? directWalk.path : [originPt, destPt];

    return {
      isMultimodal: false,
      distance: directWalk.distance,
      duration: directWalk.duration,
      route: fallbackPath
    };
  }
}

module.exports = {
  findBestBoardingAndDropoff,
  evaluateRouteForPoints,
  calculateOptimalRoute
};
