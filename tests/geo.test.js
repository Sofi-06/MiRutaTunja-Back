const {
  getHaversineDistance,
  projectPointOnSegment,
  addCoords,
  chainSegments
} = require('../src/utils/geo');

describe('Geo Utilities (Funciones Puras)', () => {
  describe('getHaversineDistance', () => {
    it('debería retornar 0 para el mismo punto', () => {
      const pt = [-73.3678, 5.5353];
      expect(getHaversineDistance(pt, pt)).toBe(0);
    });

    it('debería retornar Infinity si algún punto es nulo', () => {
      expect(getHaversineDistance(null, [-73.3678, 5.5353])).toBe(Infinity);
      expect(getHaversineDistance([-73.3678, 5.5353], null)).toBe(Infinity);
    });

    it('debería calcular correctamente la distancia real entre dos puntos en Tunja', () => {
      // Plaza de Bolívar a Unicentro Tunja (~2.5km a 3km en línea recta)
      const plazaBolivar = [-73.3615, 5.5324];
      const unicentro = [-73.3542, 5.5531];
      const dist = getHaversineDistance(plazaBolivar, unicentro);

      expect(dist).toBeGreaterThan(2000);
      expect(dist).toBeLessThan(3000);
    });
  });

  describe('projectPointOnSegment', () => {
    it('debería proyectar un punto intermedio exactamente sobre el segmento', () => {
      const a = [-73.3600, 5.5300];
      const b = [-73.3600, 5.5400];
      const p = [-73.3590, 5.5350]; // Ligeramente al este del punto medio

      const proj = projectPointOnSegment(p, a, b);
      expect(proj).toHaveProperty('point');
      expect(proj).toHaveProperty('distance');
      expect(proj).toHaveProperty('t');
      expect(proj.t).toBeCloseTo(0.5, 1);
      expect(proj.point[1]).toBeCloseTo(5.5350, 3);
      expect(proj.distance).toBeGreaterThan(0);
    });

    it('debería sujetar la proyección a los extremos (t=0 o t=1)', () => {
      const a = [-73.3600, 5.5300];
      const b = [-73.3600, 5.5400];
      const beforeA = [-73.3600, 5.5200];
      const afterB = [-73.3600, 5.5500];

      const projA = projectPointOnSegment(beforeA, a, b);
      expect(projA.t).toBe(0);
      expect(projA.point[1]).toBe(a[1]);

      const projB = projectPointOnSegment(afterB, a, b);
      expect(projB.t).toBe(1);
      expect(projB.point[1]).toBe(b[1]);
    });
  });

  describe('addCoords', () => {
    it('debería agregar puntos evitando duplicados consecutivos', () => {
      const target = [[-73.36, 5.53]];
      const source = [
        [-73.36, 5.53], // Duplicado
        [-73.37, 5.54],
        [-73.37, 5.54], // Duplicado
        [-73.38, 5.55]
      ];

      addCoords(target, source);
      expect(target.length).toBe(3);
      expect(target).toEqual([
        [-73.36, 5.53],
        [-73.37, 5.54],
        [-73.38, 5.55]
      ]);
    });
  });

  describe('chainSegments', () => {
    it('debería encadenar tramos ordenados o invertidos para continuidad', () => {
      const seg1 = [[0, 0], [1, 1]];
      const seg2 = [[2, 2], [1, 1]]; // Invertido respecto al final de seg1

      const chained = chainSegments([seg1, seg2]);
      expect(chained.length).toBe(3);
      expect(chained[0]).toEqual([0, 0]);
      expect(chained[chained.length - 1]).toEqual([2, 2]);
    });

    it('debería manejar casos vacíos o de un solo tramo', () => {
      expect(chainSegments([])).toEqual([]);
      expect(chainSegments([[[1, 1], [2, 2]]])).toEqual([[1, 1], [2, 2]]);
    });
  });
});
