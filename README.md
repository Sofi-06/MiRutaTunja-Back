# ⚙️ MiRutaTunja API

API encargada de la gestión de datos y servicios de la plataforma MiRutaTunja.

## Estado del proyecto

🟡 MVP en desarrollo - Enrutamiento multimodal (caminata + bus + caminata) integrado y funcional.

## Tecnologías

- Node.js & Express
- CORS (habilitado para la integración con React Native/Web)
- OSRM (Open Source Routing Machine) API para cálculo de trayectos a pie

## Estructura del proyecto

```
MiRutaTunja-Back/
├── index.js                       # Entrypoint: carga rutas GeoJSON y levanta el servidor
├── index.test.js                  # Tests (Jest + Supertest)
└── src/
    ├── app.js                     # Configuración de Express (CORS, JSON, montaje de rutas)
    ├── config/                    # Configuración (puerto, entorno)
    ├── controllers/
    │   └── route.controller.js    # Controlador de POST /routes
    ├── data/
    │   └── routeRegistry.js       # Carga el registro de rutas GeoJSON (../MiRutaTunja-Front/assets/routes)
    ├── middlewares/
    │   ├── validation.js          # Validación de origin/destination
    │   └── errorHandler.js        # Manejador centralizado de errores
    ├── routes/
    │   └── route.routes.js        # Definición de endpoints
    ├── services/
    │   ├── osrm.service.js        # Resolución de tramos a pie vía OSRM
    │   └── routing.service.js     # Lógica de optimización de rutas multimodales
    └── utils/
        └── geo.js                 # Utilidades geográficas (Haversine, proyección sobre segmento)
```

---

## 🚀 Comandos del Servidor

### 1. Instalación de Dependencias

Antes de ejecutar el servidor, instala las dependencias necesarias:

```bash
npm install
```

### 2. Iniciar Servidor en Desarrollo

Para levantar el servidor en el puerto local `3000`:

```bash
npm start
```

El endpoint estará disponible en `POST http://localhost:3000/routes`.

### 3. Ejecutar Pruebas Automatizadas (Tests)

Hemos implementado un conjunto de pruebas con **Jest** y **Supertest** para asegurar el correcto procesamiento de coordenadas y la respuesta de OSRM:

```bash
npm test
```

---

## 📡 Detalle del API (Endpoints)

### `POST /routes`

Calcula la mejor ruta entre dos coordenadas geográficas. Si existe una ruta de bus (`routeCode`) que cubra el trayecto, retorna una ruta multimodal (caminata → bus → caminata); en caso contrario, retorna una caminata directa resuelta sobre las calles usando OSRM.

* **Cuerpo de la Petición (Request Body):**
  ```json
  {
    "origin": {
      "lat": 5.5353,
      "lng": -73.3678
    },
    "destination": {
      "lat": 5.5371,
      "lng": -73.3621
    },
    "routeCode": "R1"
  }
  ```
  - `origin` / `destination` (requeridos): coordenadas `{ lat, lng }` numéricas dentro de rangos geográficos válidos.
  - `routeCode` (opcional): código de ruta de bus a priorizar (ej. `"R1"`, `"R-01"`). Si se omite o no cubre el trayecto, se evalúan todas las rutas disponibles y se elige la de menor costo (caminata + desvío en bus).

* **Respuesta Correcta - Ruta Multimodal (200 OK):**
  ```json
  {
    "isMultimodal": true,
    "distance": 1450.2,
    "duration": 320.7,
    "route": [ [-73.3678, 5.5353], "..." ],
    "tramoA": [ "..." ],
    "tramoB": [ "..." ],
    "tramoC": [ "..." ],
    "boardingPoint": [-73.3675, 5.5354],
    "dropoffPoint": [-73.3625, 5.5369],
    "selectedRouteKey": "R1",
    "alternatives": [
      { "routeKey": "R1", "direction": "ida", "walkOrigin": 80.1, "walkDest": 45.3, "busDist": 900.5 }
    ],
    "details": {
      "walkDistanceOrigin": 80.1,
      "walkDurationOrigin": 60.2,
      "busDistance": 900.5,
      "busDuration": 129.8,
      "walkDistanceDest": 45.3,
      "walkDurationDest": 32.1,
      "direction": "ida",
      "routeCode": "R1",
      "boardingPoint": [-73.3675, 5.5354],
      "dropoffPoint": [-73.3625, 5.5369]
    }
  }
  ```

* **Respuesta Correcta - Caminata Directa (200 OK):**
  ```json
  {
    "isMultimodal": false,
    "distance": 1096.7,
    "duration": 113.5,
    "route": [
      [-73.368169, 5.535256],
      [-73.36825, 5.535926]
    ]
  }
  ```

* **Errores (400 Bad Request):**
  - `{ "error": "Origin and destination are required" }` — falta `origin` o `destination`.
  - `{ "error": "Coordinates must be valid numbers" }` — `lat`/`lng` no son numéricos.
  - `{ "error": "Coordinates are out of geographical range" }` — coordenadas fuera de rango válido (`lat`: -90 a 90, `lng`: -180 a 180).
