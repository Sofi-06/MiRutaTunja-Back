const express = require('express');
const router = express.Router();
const placesController = require('../controllers/places.controller');

// GET /places/search?q=
router.get('/search', placesController.search);

// GET /places/reverse?lat=&lng=
router.get('/reverse', placesController.reverse);

module.exports = router;
