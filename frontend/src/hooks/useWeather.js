import { useState, useEffect, useRef } from 'react';
import { getWeatherForecast } from '../services/weatherService';
import { getCalendarDayDiff } from '../lib/dateUtils';

export function useWeather(latitude, longitude, date, time) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (latitude == null || longitude == null || !date) {
      setWeather(null);
      return;
    }

    const diffDays = getCalendarDayDiff(date);

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
