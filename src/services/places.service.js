const config = require('../config');

/**
 * Formatea cualquier dirección a un estilo colombiano estándar (ej. Cra. 11 # 7-81).
 * Si no hay número de casa, interpola uno con base en las coordenadas.
 */
function formatColombianAddress(addressStr, lat, lng) {
  let addr = (addressStr || '').trim().replace(/\s+/g, ' ');

  addr = addr.replace(/^carrera\s+/i, 'Cra. ');
  addr = addr.replace(/^calle\s+/i, 'Cl. ');
  addr = addr.replace(/^avenida\s+/i, 'Av. ');
  addr = addr.replace(/^diagonal\s+/i, 'Diag. ');
  addr = addr.replace(/^transversal\s+/i, 'Trans. ');

  // Caso A: Ya viene con un signo # (ej: Cra. 11 # 7-81)
  if (addr.includes('#')) {
    addr = addr.replace(/(\w+)\.?\s*#\s*(\d+)\s*-?\s*(\d+)/i, (match, streetPart, num1, num2) => {
      return `${streetPart} # ${num1}-${num2}`;
    });
    return addr;
  }

  // Caso B: Viene la calle o carrera pero sin el número de casa
  const carreraMatch = addr.match(/^(carrera|cra\.?)\s+(\d+)/i);
  if (carreraMatch) {
    const craNum = carreraMatch[2];
    const calleNum = Math.max(1, Math.round(19 + (lat - 5.53246) * 840));
    const houseNum = Math.round(Math.abs(lng * 100000) % 80) + 10;
    return `Cra. ${craNum} # ${calleNum}-${houseNum}`;
  }

  const calleMatch = addr.match(/^(calle|cl\.?)\s+(\d+)/i);
  if (calleMatch) {
    const clNum = calleMatch[2];
    const craNum = Math.max(1, Math.round(10 + (-73.36155 - lng) * 482));
    const houseNum = Math.round(Math.abs(lat * 100000) % 80) + 10;
    return `Cl. ${clNum} # ${craNum}-${houseNum}`;
  }

  // Caso C: Sin nombre de calle reconocible; se genera una dirección sintética
  // basada en la cuadrícula de Tunja
  const fallbackCra = Math.max(1, Math.round(10 + (-73.36155 - lng) * 482));
  const fallbackCl = Math.max(1, Math.round(19 + (lat - 5.53246) * 840));
  const fallbackHouse = Math.round(Math.abs(lat * 100000) % 80) + 10;
  return `Cra. ${fallbackCra} # ${fallbackCl}-${fallbackHouse}`;
}

/**
 * Busca lugares que coincidan con la consulta.
 * 1. Nominatim (OSM Search API).
 * 2. Google Places API (New Text Search) como respaldo.
 */
async function searchPlaces(query) {
  const trimmed = (query || '').trim();
  if (!trimmed) return [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(`${trimmed} Tunja`)}&email=danim.u.ponencia@gmail.com`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'es',
        'User-Agent': 'MiRutaTunjaApp/1.0'
      }
    });

    if (response.ok) {
      const results = await response.json();
      if (results && results.length > 0) {
        return results.map((item) => ({
          name: item.display_name.split(',')[0],
          address: item.display_name.split(',').slice(1).join(',').trim(),
          lat: Number.parseFloat(item.lat),
          lng: Number.parseFloat(item.lon)
        }));
      }
    }
  } catch (error) {
    if (config.nodeEnv !== 'test') {
      console.error('[places.service] Nominatim request error:', error.message);
    }
  }

  if (!config.googlePlacesApiKey) {
    return [];
  }

  try {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': config.googlePlacesApiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location'
      },
      body: JSON.stringify({
        textQuery: `${trimmed}, Tunja, Boyacá, Colombia`,
        languageCode: 'es',
        maxResultCount: 5
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.places && data.places.length > 0) {
        return data.places.map((place) => ({
          name: place.displayName?.text || 'Ubicación encontrada',
          address: place.formattedAddress,
          lat: place.location.latitude,
          lng: place.location.longitude
        }));
      }
    } else if (config.nodeEnv !== 'test') {
      const errorText = await response.text();
      console.error(`[places.service] Google Places API error: status ${response.status}`, errorText);
    }
  } catch (error) {
    if (config.nodeEnv !== 'test') {
      console.error('[places.service] Google Places API request error:', error.message);
    }
  }

  return [];
}

/**
 * Resuelve coordenadas a una dirección legible.
 * 1. Mapbox Geocoding (si hay token configurado).
 * 2. Nominatim (OSM) como respaldo.
 */
async function reverseGeocode(lat, lng) {
  if (config.mapboxToken) {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${config.mapboxToken}&types=address,poi&limit=1`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data && data.features && data.features.length > 0) {
          const feature = data.features[0];
          const street = feature.text;
          const houseNumber = feature.address;

          if (street) {
            const rawAddress = houseNumber ? `${street} # ${houseNumber}` : street;
            return formatColombianAddress(rawAddress, lat, lng);
          }

          if (feature.place_name) {
            const shortName = feature.place_name.split(',')[0].trim();
            return formatColombianAddress(shortName, lat, lng);
          }
        }
      }
    } catch (error) {
      if (config.nodeEnv !== 'test') {
        console.error('[places.service] Mapbox reverse geocoding error:', error.message);
      }
    }
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'es',
        'User-Agent': 'MiRutaTunjaApp/1.0'
      }
    });

    if (response.ok) {
      const result = await response.json();
      if (result && result.display_name) {
        const addr = result.address;
        if (addr) {
          const street = addr.road || addr.pedestrian || addr.suburb || '';
          const house = addr.house_number || '';
          if (street) {
            const rawAddress = house ? `${street} # ${house}` : street;
            return formatColombianAddress(rawAddress, lat, lng);
          }
        }
        const shortName = result.display_name.split(',')[0].trim();
        return formatColombianAddress(shortName, lat, lng);
      }
    }
  } catch (error) {
    if (config.nodeEnv !== 'test') {
      console.error('[places.service] Nominatim reverse geocode error:', error.message);
    }
  }

  return formatColombianAddress('', lat, lng);
}

module.exports = {
  searchPlaces,
  reverseGeocode
};
