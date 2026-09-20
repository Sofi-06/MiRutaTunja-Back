const routingService = require('../services/routing.service');

/**
 * Controlador para calcular rutas multimodales o directas
 */
async function calculateRoute(req, res, next) {
  try {
    const { origin, destination, routeCode } = req.body;
    const result = await routingService.calculateOptimalRoute({
      origin,
      destination,
      routeCode
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  calculateRoute
};
