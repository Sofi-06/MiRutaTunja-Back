const express = require('express');
const cors = require('cors');
const routeRoutes = require('./routes/route.routes');
const placesRoutes = require('./routes/places.routes');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

// Montaje de rutas
app.use('/routes', routeRoutes);
app.use('/places', placesRoutes);

// Manejador centralizado de errores
app.use(errorHandler);

module.exports = app;
