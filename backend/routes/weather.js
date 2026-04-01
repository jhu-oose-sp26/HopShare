const express = require('express');
const router = express.Router();

// Simple in-memory cache with 30-minute TTL
const cache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const WEATHERAPI_KEY = process.env.WEATHERAPI_KEY;
const WEATHER_API_BASE = 'http://api.weatherapi.com/v1';

// Clean up expired cache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      cache.delete(key);
    }
  }
}, 10 * 60 * 1000); // Clean every 10 minutes

async function fetchWeatherData(lat, lon, date, time) {
  if (!WEATHERAPI_KEY || WEATHERAPI_KEY.trim() === '') {
    throw new Error('WeatherAPI key not configured');
  }

  const targetDate = new Date(date);
  const today = new Date();
  
  // Reset time to start of day for accurate day comparison
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

  // Only provide weather forecast for dates within 14 days from today
  if (diffDays > 14) {
    return null;
  }

  // Format coordinates for WeatherAPI (lat,lon)
  const locationParam = `${lat.toFixed(4)},${lon.toFixed(4)}`;

  let response, data;
  
  if (diffDays <= 0) {
    // Current or past date - use current weather
    response = await fetch(
      `${WEATHER_API_BASE}/current.json?key=${WEATHERAPI_KEY}&q=${locationParam}`
    );
  } else {
    // Future date within 14 days - use forecast
    response = await fetch(
      `${WEATHER_API_BASE}/forecast.json?key=${WEATHERAPI_KEY}&q=${locationParam}&days=${Math.min(diffDays + 1, 14)}&dt=${date}`
    );
  }
  
  if (response.status === 401) {
    throw new Error('API key invalid');
  }
  
  if (response.status === 400) {
    throw new Error('Location not found');
  }
  
  if (!response.ok) {
    throw new Error(`Weather API request failed (${response.status})`);
  }
  
  data = await response.json();
  
  let weatherData;
  
  if (diffDays <= 0) {
    // Current weather response
    const current = data.current;
    weatherData = {
      temp: Math.round(current.temp_c),
      condition: current.condition.text,
      description: current.condition.text,
      icon: current.condition.icon.replace('//', 'https://'),
      humidity: current.humidity,
      windSpeed: current.wind_kph,
      isCurrent: true
    };
  } else {
    // Forecast response - find the closest hour to target time
    const targetDateTime = new Date(`${date}T${time}`);
    let closestForecast = null;
    let minDiff = Infinity;
    
    // Look through forecast days
    for (const day of data.forecast.forecastday) {
      if (day.date === date) {
        // Found the target date, now find closest hour
        for (const hour of day.hour) {
          const hourDate = new Date(hour.time);
          const diff = Math.abs(hourDate - targetDateTime);
          if (diff < minDiff) {
            minDiff = diff;
            closestForecast = hour;
          }
        }
        break;
      }
    }
    
    if (!closestForecast) {
      // Fallback to day forecast if hour not found
      const targetDay = data.forecast.forecastday.find(day => day.date === date);
      if (targetDay) {
        const dayData = targetDay.day;
        weatherData = {
          temp: Math.round(dayData.avgtemp_c),
          condition: dayData.condition.text,
          description: dayData.condition.text,
          icon: dayData.condition.icon.replace('//', 'https://'),
          humidity: dayData.avghumidity,
          windSpeed: dayData.maxwind_kph,
          isCurrent: false
        };
      } else {
        return null;
      }
    } else {
      weatherData = {
        temp: Math.round(closestForecast.temp_c),
        condition: closestForecast.condition.text,
        description: closestForecast.condition.text,
        icon: closestForecast.condition.icon.replace('//', 'https://'),
        humidity: closestForecast.humidity,
        windSpeed: closestForecast.wind_kph,
        isCurrent: false
      };
    }
  }

  return weatherData;
}

// GET /weather/forecast?lat=...&lon=...&date=...&time=...
router.get('/forecast', async (req, res) => {
  try {
    const { lat, lon, date, time = '12:00' } = req.query;

    // Validate required parameters
    if (!lat || !lon || !date) {
      return res.status(400).json({
        error: 'Missing required parameters: lat, lon, date'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: 'Invalid coordinates: lat and lon must be numbers'
      });
    }

    // Create cache key
    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)},${date},${time}`;
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.json(cached.data);
    }

    // Fetch from weather API
    const weatherData = await fetchWeatherData(latitude, longitude, date, time);

    if (!weatherData) {
      return res.status(404).json({
        error: 'Weather data not available for the specified date'
      });
    }

    // Cache the result
    cache.set(cacheKey, {
      data: weatherData,
      timestamp: Date.now()
    });

    res.json(weatherData);

  } catch (error) {
    console.error('Weather API error:', error.message);
    
    // Return appropriate error status
    if (error.message.includes('API key')) {
      return res.status(500).json({ error: 'Weather service configuration error' });
    }
    
    if (error.message.includes('Location not found')) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.status(500).json({ error: 'Weather service unavailable' });
  }
});

module.exports = router;