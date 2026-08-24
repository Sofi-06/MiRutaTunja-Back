const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Endpoint POST /routes
app.post('/routes', async (req, res) => {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }

    if (
      typeof origin.lat !== 'number' || typeof origin.lng !== 'number' ||
      typeof destination.lat !== 'number' || typeof destination.lng !== 'number'
    ) {
      return res.status(400).json({ error: 'Coordinates must be valid numbers' });
    }

    // OSRM utiliza longitud,latitud
    const coordinatesStr = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    const osrmUrl = `https://router.project-osrm.org/route/v1/walking/${coordinatesStr}?overview=full&geometries=geojson`;

    console.log(`Calculating walking route via OSRM: ${osrmUrl}`);
    const response = await fetch(osrmUrl);
    
    if (!response.ok) {
      throw new Error(`OSRM API responded with status ${response.status}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      return res.status(404).json({ error: 'No route found' });
    }

    const routeData = data.routes[0];
    
    // OSRM devuelve [longitude, latitude], invertimos para Leaflet/Frontend si es necesario, 
    // pero el cliente quiere recibir:
    // route: [[lng, lat], [lng, lat]] como describe el OSRM o [lat, lng].
    // Vamos a ver la descripción del usuario:
    // "route": [ [-73.3678, 5.5353], ... ] -> es decir, [longitude, latitude]
    const routeCoordinates = routeData.geometry.coordinates;

    res.json({
      distance: routeData.distance, // en metros
      duration: routeData.duration, // en segundos
      route: routeCoordinates
    });

  } catch (error) {
    console.error('Error calculating route:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Mi Ruta Tunja Backend running on port ${PORT}`);
  });
}

module.exports = app;

