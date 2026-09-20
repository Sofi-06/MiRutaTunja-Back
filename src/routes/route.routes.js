const express = require('express');
const router = express.Router();
const routeController = require('../controllers/route.controller');
const { validateRouteInput } = require('../middlewares/validation');

// POST /routes
router.post('/', validateRouteInput, routeController.calculateRoute);

module.exports = router;
