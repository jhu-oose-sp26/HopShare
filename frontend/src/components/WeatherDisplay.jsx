import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, Thermometer } from 'lucide-react';
import { useWeather } from '../hooks/useWeather';
import { getWeatherIconUrl } from '../services/weatherService';

const WeatherIcon = ({ condition, iconCode }) => {
  // Fallback icons if API icon fails
  const iconMap = {
    Clear: Sun,
    Clouds: Cloud,
    Rain: CloudRain,
    Snow: CloudSnow,
    Drizzle: CloudRain,
  };
  
  const FallbackIcon = iconMap[condition] || Cloud;
  
  return (
    <div className="flex items-center justify-center w-8 h-8">
      {iconCode ? (
        <img 
          src={getWeatherIconUrl(iconCode)}
          alt={condition}
          className="w-8 h-8"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
      ) : null}
      <FallbackIcon 
        className="w-6 h-6 text-muted-foreground" 
        style={{ display: iconCode ? 'none' : 'block' }}
      />
    </div>
  );
};

export const WeatherDisplay = ({ latitude, longitude, date, time, location, compact = false }) => {
  const { weather, loading, error } = useWeather(latitude, longitude, date, time);

  // Don't show loading for more than 3 seconds, fail silently
  const [showLoading, setShowLoading] = useState(true);
  
  useEffect(() => {
    if (loading) {
      setShowLoading(true);
      const timer = setTimeout(() => {
        setShowLoading(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading && showLoading) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
        Loading weather...
      </div>
    );
  }

  if (error || !weather) {
    return null; // Silently fail for weather data
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <WeatherIcon condition={weather.condition} iconCode={weather.icon} />
        <span className="font-medium">{weather.temp}°C</span>
        <span className="capitalize">{weather.description}</span>
      </div>
    );
  }

  return (
    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WeatherIcon condition={weather.condition} iconCode={weather.icon} />
          <div>
            <div className="font-medium text-lg">{weather.temp}°C</div>
            <div className="text-sm text-muted-foreground capitalize">
              {weather.description}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">
            {weather.isCurrent ? 'Current weather' : 'Forecast'}
          </div>
          <div className="text-xs font-medium text-muted-foreground">
            {location}
          </div>
        </div>
      </div>
      
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Droplets className="w-3 h-3" />
          <span>{weather.humidity}%</span>
        </div>
        <div className="flex items-center gap-1">
          <Wind className="w-3 h-3" />
          <span>{Math.round(weather.windSpeed)} m/s</span>
        </div>
      </div>
    </div>
  );
};

export default WeatherDisplay;