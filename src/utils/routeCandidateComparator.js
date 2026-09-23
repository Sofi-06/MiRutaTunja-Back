/**
 * Comparador puro para decidir cuál de dos candidatos de viaje (par de puntos de
 * abordaje/descenso sobre una ruta, o rutas distintas ya evaluadas) es mejor.
 *
 * Reemplaza los "scores" ponderados (ej. `walkOrigin * 2 + walkDest * 2 + busDist * 0.08`)
 * por un orden lexicográfico jerárquico de 3 niveles, más fácil de razonar y de testear
 * de forma aislada que una fórmula con pesos mágicos:
 *
 *   1) Caminata al destino (`walkDest`): quien deja al usuario significativamente más
 *      cerca de su destino gana, sin importar el resto.
 *   2) Desempate por caminata al origen (`walkOrigin`): si la diferencia en `walkDest`
 *      es pequeña (dentro de DEST_TIE_MARGIN_METERS), gana quien exige menos caminata
 *      para abordar el bus.
 *   3) Desempate por distancia en bus (`busDist`): si además empatan en caminata de
 *      origen, gana el trayecto en bus más corto.
 *
 * Se usa tanto para elegir el mejor par abordaje/descenso dentro de una sola ruta
 * (`findBestBoardingAndDropoff`) como para elegir la mejor ruta entre todas las
 * evaluadas (`calculateOptimalRoute`) — la noción de "candidato mejor" es la misma
 * en ambos casos, así que se centraliza en un único lugar.
 */

/** Diferencia de caminata al destino, en metros, por debajo de la cual se considera un empate. */
const DEST_TIE_MARGIN_METERS = 30;

/** Diferencia de caminata al origen, en metros, por debajo de la cual se considera un empate. */
const ORIGIN_TIE_MARGIN_METERS = 5;

/**
 * @typedef {object} RouteCandidateMetrics
 * @property {number} walkOrigin - Distancia caminando desde el origen hasta el punto de abordaje (m).
 * @property {number} walkDest - Distancia caminando desde el punto de descenso hasta el destino (m).
 * @property {number} busDist - Distancia recorrida en bus entre abordaje y descenso (m).
 */

/**
 * Compara dos candidatos siguiendo el orden jerárquico descrito arriba.
 * Apta para usarse directamente como comparador de `Array.prototype.sort`.
 *
 * @param {RouteCandidateMetrics} a
 * @param {RouteCandidateMetrics} b
 * @returns {number} Negativo si `a` es mejor, positivo si `b` es mejor, 0 si son equivalentes.
 */
function compareRouteCandidates(a, b) {
  const destDiff = a.walkDest - b.walkDest;
  if (Math.abs(destDiff) >= DEST_TIE_MARGIN_METERS) {
    return destDiff;
  }

  const originDiff = a.walkOrigin - b.walkOrigin;
  if (Math.abs(originDiff) >= ORIGIN_TIE_MARGIN_METERS) {
    return originDiff;
  }

  return a.busDist - b.busDist;
}

module.exports = {
  compareRouteCandidates,
  DEST_TIE_MARGIN_METERS,
  ORIGIN_TIE_MARGIN_METERS
};
