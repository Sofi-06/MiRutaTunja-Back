const {
  compareRouteCandidates,
  DEST_TIE_MARGIN_METERS,
  ORIGIN_TIE_MARGIN_METERS
} = require('../src/utils/routeCandidateComparator');

describe('compareRouteCandidates (Función Pura)', () => {
  it('debería preferir al candidato que deja significativamente más cerca del destino', () => {
    const closerToDest = { walkOrigin: 500, walkDest: 50, busDist: 5000 };
    const fartherFromDest = { walkOrigin: 50, walkDest: 500, busDist: 100 };

    expect(compareRouteCandidates(closerToDest, fartherFromDest)).toBeLessThan(0);
    expect(compareRouteCandidates(fartherFromDest, closerToDest)).toBeGreaterThan(0);
  });

  it('no debería considerar "significativa" una diferencia de destino menor al margen', () => {
    const a = { walkOrigin: 100, walkDest: 200, busDist: 1000 };
    const b = { walkOrigin: 100, walkDest: 200 + (DEST_TIE_MARGIN_METERS - 1), busDist: 1000 };

    expect(compareRouteCandidates(a, b)).toBe(0);
  });

  it('debería desempatar por caminata al origen cuando la caminata al destino es similar', () => {
    const lessOriginWalk = { walkOrigin: 50, walkDest: 200, busDist: 5000 };
    const moreOriginWalk = { walkOrigin: 500, walkDest: 200 + (DEST_TIE_MARGIN_METERS - 1), busDist: 100 };

    expect(compareRouteCandidates(lessOriginWalk, moreOriginWalk)).toBeLessThan(0);
  });

  it('no debería considerar "significativa" una diferencia de origen menor al margen', () => {
    const a = { walkOrigin: 100, walkDest: 200, busDist: 1000 };
    const b = { walkOrigin: 100 + (ORIGIN_TIE_MARGIN_METERS - 1), walkDest: 200, busDist: 1000 };

    expect(compareRouteCandidates(a, b)).toBe(0);
  });

  it('debería desempatar por distancia en bus cuando ambas caminatas son equivalentes', () => {
    const shorterBus = { walkOrigin: 100, walkDest: 200, busDist: 1000 };
    const longerBus = { walkOrigin: 100, walkDest: 200, busDist: 3000 };

    expect(compareRouteCandidates(shorterBus, longerBus)).toBeLessThan(0);
    expect(compareRouteCandidates(longerBus, shorterBus)).toBeGreaterThan(0);
  });

  it('debería retornar 0 para candidatos equivalentes en los tres niveles', () => {
    const a = { walkOrigin: 100, walkDest: 200, busDist: 1000 };
    const b = { walkOrigin: 100, walkDest: 200, busDist: 1000 };

    expect(compareRouteCandidates(a, b)).toBe(0);
  });

  it('debería ordenar un arreglo de candidatos priorizando destino > origen > bus', () => {
    const candidates = [
      { name: 'lejosDeDestino', walkOrigin: 10, walkDest: 900, busDist: 100 },
      { name: 'cercaDestinoLejosOrigen', walkOrigin: 800, walkDest: 50, busDist: 100 },
      { name: 'cercaDestinoCercaOrigenBusLargo', walkOrigin: 50, walkDest: 50, busDist: 5000 },
      { name: 'cercaDestinoCercaOrigenBusCorto', walkOrigin: 50, walkDest: 50, busDist: 1000 }
    ];

    const sorted = [...candidates].sort(compareRouteCandidates);

    expect(sorted.map((c) => c.name)).toEqual([
      'cercaDestinoCercaOrigenBusCorto',
      'cercaDestinoCercaOrigenBusLargo',
      'cercaDestinoLejosOrigen',
      'lejosDeDestino'
    ]);
  });
});
