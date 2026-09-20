const placesService = require('../services/places.service');

/**
 * Controlador para buscar lugares por texto (GET /places/search?q=)
 */
async function search(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || !q.trim()) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const results = await placesService.searchPlaces(q);
    return res.json(results);
  } catch (error) {
    next(error);
  }
}

/**
 * Controlador para geocodificación inversa (GET /places/reverse?lat=&lng=)
 */
async function reverse(req, res, next) {
  try {
    const lat = Number.parseFloat(req.query.lat);
    const lng = Number.parseFloat(req.query.lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'Query parameters "lat" and "lng" must be valid numbers' });
    }

    const address = await placesService.reverseGeocode(lat, lng);
    return res.json({ address });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  search,
  reverse
};
