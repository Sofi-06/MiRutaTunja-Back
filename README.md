# ⚙️ MiRutaTunja API

API encargada de la gestión de datos y servicios de la plataforma MiRutaTunja.

## Estado del proyecto

🟡 MVP en desarrollo - Endpoint de enrutamiento integrado y funcional.

## Tecnologías

- Node.js & Express
- CORS (habilitado para la integración con React Native/Web)
- OSRM (Open Source Routing Machine) API para cálculo de trayectos a pie

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

Calcula la ruta a pie entre dos coordenadas geográficas y retorna el trayecto adaptado sobre las calles usando OSRM.

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
    }
  }
  ```

* **Respuesta Correcta (Response Body - 200 OK):**
  ```json
  {
    "distance": 1096.7,
    "duration": 113.5,
    "route": [
      [-73.368169, 5.535256],
      [-73.36825, 5.535926],
      ...
    ]
  }
  ```