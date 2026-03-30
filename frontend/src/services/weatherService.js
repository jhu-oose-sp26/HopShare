// Weather service that calls our backend API
// Backend handles weather API calls securely with server-side caching

// Simple cache to avoid redundant requests within the same session
const cache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Clean up expired cache entries
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      cache.delete(key);
    }
  }
}, 10 * 60 * 1000); // Clean every 10 minutes

export async function getWeatherForecast(latitude, longitude, date, time = '12:00') {
  if (!latitude || !longitude || !date) {
    return null;
  }

  // Check if date is within 14 days from today
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

  // Create cache key
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)},${date},${time}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Call our backend weather API
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
      date: date,
      time: time
    });

    const response = await fetch(`http://localhost:3000/weather/forecast?${params}`);
    
    if (!response.ok) {
      // Handle different error types
      if (response.status === 404) {
        // Weather data not available for date
        return null;
      }
      if (response.status === 400) {
        console.warn('Invalid weather request parameters');
        return null;
      }
      if (response.status === 500) {
        console.warn('Weather service unavailable');
        return null;
      }
      throw new Error(`Weather request failed: ${response.status}`);
    }

    const weatherData = await response.json();
    
    // Cache the result
    cache.set(cacheKey, {
      data: weatherData,
      timestamp: Date.now()
    });

    return weatherData;
  } catch (error) {
    // Silently return null for network errors to avoid console spam
    return null;
  }
}

export function getWeatherIconUrl(iconCode) {
  // WeatherAPI provides full URLs in their icon field
  return iconCode?.startsWith('http') ? iconCode : `https:${iconCode}`;
}