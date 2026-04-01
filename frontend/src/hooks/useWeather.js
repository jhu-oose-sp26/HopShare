import { useState, useEffect, useRef } from 'react';
import { getWeatherForecast } from '../services/weatherService';

export function useWeather(latitude, longitude, date, time) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!latitude || !longitude || !date) {
      setWeather(null);
      return;
    }

    // Check if date is within 14 days from today (same logic as weatherService)
    const targetDate = new Date(date);
    const today = new Date();
    
    // Reset time to start of day for accurate day comparison
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

    // Don't even start loading for dates beyond 14 days
    if (diffDays > 14) {
      setWeather(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Add a small delay to debounce rapid requests
    timeoutRef.current = setTimeout(async () => {
      if (cancelled) return;

      setLoading(true);
      setError(null);
      
      try {
        const weatherData = await getWeatherForecast(latitude, longitude, date, time);
        if (!cancelled) {
          setWeather(weatherData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setWeather(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 500); // 500ms debounce

    return () => {
      cancelled = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [latitude, longitude, date, time]);

  return { weather, loading, error };
}