const request = require('supertest');
const app = require('./index');

describe('POST /routes - Ruta OSRM', () => {
  // Test case 1: Origin and destination are valid and route is calculated
  it('Debería retornar distancia, duración y la ruta de coordenadas para puntos válidos', async () => {
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
    expect(typeof res.body.distance).toBe('number');
    expect(Array.isArray(res.body.route)).toBe(true);
    expect(res.body.route.length).toBeGreaterThan(0);
  });

  // Test case 2: Check for missing coordinates validation
  it('Debería retornar error 400 si falta el origen o el destino', async () => {
    const res = await request(app)
      .post('/routes')
      .send({
        origin: { lat: 5.5353, lng: -73.3678 }
        // Falta destination
      });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error', 'Origin and destination are required');
  });

  // Test case 3: Validate coordinates types
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
