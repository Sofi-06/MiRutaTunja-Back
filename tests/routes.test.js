const request = require('supertest');

jest.mock('../src/services/osrm.service', () => ({
  resolveWalkingLeg: jest.fn().mockImplementation(async (startPt, endPt) => ({
    path: [startPt, endPt],
    distance: 100,
    duration: 72
  }))
}));

const app = require('../src/app');
const { loadAllRoutes } = require('../src/data/routeRegistry');

beforeAll(() => {
  loadAllRoutes();
});

describe('POST /routes - API de Ruteo Multimodal', () => {
  it('Debería retornar cálculo multimodal completo para coordenadas válidas', async () => {
    const res = await request(app)
      .post('/routes')
      .send({
        origin: { lat: 5.5353, lng: -73.3678 },
        destination: { lat: 5.5371, lng: -73.3621 }
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('distance');
    expect(res.body).toHaveProperty('duration');
    expect(res.body).toHaveProperty('route');
    expect(res.body).toHaveProperty('isMultimodal');
    expect(typeof res.body.distance).toBe('number');
    expect(Array.isArray(res.body.route)).toBe(true);
    expect(res.body.route.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('details');
  });

  it('Debería respetar el routeCode cuando se solicita una ruta específica', async () => {
    const res = await request(app)
      .post('/routes')
      .send({
        origin: { lat: 5.5353, lng: -73.3678 },
        destination: { lat: 5.5371, lng: -73.3621 },
        routeCode: 'R-01'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.selectedRouteKey).toBe('R1');
  });

  it('Debería retornar error 400 si falta el origen o el destino', async () => {
    const res = await request(app)
      .post('/routes')
      .send({
        origin: { lat: 5.5353, lng: -73.3678 }
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error', 'Origin and destination are required');
  });

  it('Debería retornar error 400 si los tipos de coordenadas no son números', async () => {
    const res = await request(app)
      .post('/routes')
      .send({
        origin: { lat: '5.5353', lng: -73.3678 },
        destination: { lat: 5.5371, lng: -73.3621 }
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error', 'Coordinates must be valid numbers');
  });
});
