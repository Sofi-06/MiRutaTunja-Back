/**
 * Middleware para validar el payload de cálculo de rutas
 */
function validateRouteInput(req, res, next) {
  const { origin, destination } = req.body;

  if (!origin || !destination) {
    return res.status(400).json({ error: 'Origin and destination are required' });
  }

  if (
    typeof origin.lat !== 'number' ||
    typeof origin.lng !== 'number' ||
    typeof destination.lat !== 'number' ||
    typeof destination.lng !== 'number'
  ) {
    return res.status(400).json({ error: 'Coordinates must be valid numbers' });
  }

  // Validar límites geográficos razonables (opcional / preventivo)
  if (
    origin.lat < -90 || origin.lat > 90 ||
    destination.lat < -90 || destination.lat > 90 ||
    origin.lng < -180 || origin.lng > 180 ||
    destination.lng < -180 || destination.lng > 180
  ) {
    return res.status(400).json({ error: 'Coordinates are out of geographical range' });
  }

  next();
}

module.exports = {
  validateRouteInput
};
