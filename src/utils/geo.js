/**
 * Utilidades matemáticas y geoespaciales puras
 */

/**
 * Fórmula de Haversine para calcular distancia esférica real entre dos coordenadas [lng, lat] en metros.
 * @param {Array<number>} coords1 - [lng, lat]
 * @param {Array<number>} coords2 - [lng, lat]
 * @returns {number} Distancia en metros
 */
function getHaversineDistance(coords1, coords2) {
  if (!coords1 || !coords2) return Infinity;
  const lon1 = coords1[0];
  const lat1 = coords1[1];
  const lon2 = coords2[0];
  const lat2 = coords2[1];

  const R = 6371000; // Radio de la Tierra en metros
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Proyecta un punto ortogonalmente sobre un segmento de línea [a, b] en el plano métrico local.
 * @param {Array<number>} p - [lng, lat] punto a proyectar
 * @param {Array<number>} a - [lng, lat] inicio del segmento
 * @param {Array<number>} b - [lng, lat] fin del segmento
 * @returns {{ point: Array<number>, distance: number, t: number }}
 */
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

/**
 * Agrega coordenadas a un arreglo destino evitando duplicados consecutivos.
 * @param {Array<Array<number>>} target 
 * @param {Array<Array<number>>} source 
 */
function addCoords(target, source) {
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
}

/**
 * Encadena tramos de líneas para formar un trazado topológicamente continuo.
 * @param {Array<Array<Array<number>>>} segments 
 * @returns {Array<Array<number>>}
 */
function chainSegments(segments) {
  if (!segments || segments.length === 0) return [];
  if (segments.length === 1) return segments[0];

  const pool = segments.map((seg) => [...seg]);
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
      // Si el tramo más cercano está aislado, agregarlo en orden
      const nextSeg = pool.shift();
      addCoords(result, nextSeg);
    }
  }

  return result;
}

module.exports = {
  getHaversineDistance,
  projectPointOnSegment,
  addCoords,
  chainSegments
};
