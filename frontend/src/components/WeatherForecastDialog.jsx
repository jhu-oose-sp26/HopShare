import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, Thermometer } from 'lucide-react';
import { getWeatherIconUrl } from '../services/weatherService';

export const WeatherForecastDialog = ({ open, onOpenChange, latitude, longitude, location, currentDate }) => {
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const WeatherIcon = ({ condition, iconCode, size = 'w-8 h-8' }) => {
    const iconMap = {
      Clear: Sun,
      Clouds: Cloud,
      Rain: CloudRain,
      Snow: CloudSnow,
      Drizzle: CloudRain,
    };
    
    const FallbackIcon = iconMap[condition] || Cloud;
    
    return (
      <div className={`flex items-center justify-center ${size}`}>
        {iconCode ? (
          <img 
            src={getWeatherIconUrl(iconCode)}
            alt={condition}
            className={size}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
        ) : null}
        <FallbackIcon 
          className={`${size === 'w-8 h-8' ? 'w-6 h-6' : 'w-5 h-5'} text-muted-foreground`}
          style={{ display: iconCode ? 'none' : 'block' }}
        />
      </div>
    );
  };

  useEffect(() => {
    if (!open || !latitude || !longitude) {
      setForecast([]);
      setError(null);
      return;
    }

    const fetch14DayForecast = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const today = new Date(); // Always use actual current date
        const forecastData = [];
        
        // Get weather for the next 14 days starting from today
        for (let i = 0; i < 14; i++) {
          const targetDate = new Date(today);
          targetDate.setDate(targetDate.getDate() + i);
          
          // Format date as YYYY-MM-DD
          const dateStr = targetDate.toISOString().split('T')[0];
          
          try {
            const response = await fetch(
              `http://localhost:3000/weather/forecast?lat=${latitude}&lon=${longitude}&date=${dateStr}`,
              {
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
            
            if (!response.ok) {
              if (response.status === 404) {
                // Weather API doesn't have data for this date, skip silently
                continue;
              }
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            forecastData.push({
              date: targetDate,
              dateStr,
              dayName: i === 0 ? 'Today' : 
                      i === 1 ? 'Tomorrow' : 
                      targetDate.toLocaleDateString('en-US', { weekday: 'long' }),
              ...data
            });
          } catch (err) {
            console.log(`Failed to fetch weather for ${dateStr}:`, err);
            // Continue with other dates even if one fails
          }
        }
        
        setForecast(forecastData);
      } catch (err) {
        console.error('Failed to fetch 14-day forecast:', err);
        setError('Unable to load weather forecast');
      } finally {
        setLoading(false);
      }
    };

    fetch14DayForecast();
  }, [open, latitude, longitude]); // Removed currentDate from dependencies since we always use actual current date

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden z-50">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            14-Day Weather Forecast
            {location && <span className="text-base font-normal text-gray-600 ml-2">for {location}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[70vh] pr-2">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading forecast...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <Cloud className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">{error}</p>
            </div>
          )}

          {!loading && !error && forecast.length === 0 && (
            <div className="text-center py-12">
              <Cloud className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No weather data available for this location</p>
            </div>
          )}

          {!loading && !error && forecast.length > 0 && (
            <div className="grid gap-3">
              {forecast.map((day, index) => (
                <div 
                  key={day.dateStr} 
                  className={`p-4 rounded-lg border transition-colors ${
                    index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-16">
                        <p className={`font-medium ${index === 0 ? 'text-blue-800' : 'text-gray-900'}`}>
                          {day.dayName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      
                      <WeatherIcon 
                        condition={day.condition} 
                        iconCode={day.icon} 
                        size="w-10 h-10" 
                      />
                      
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${index === 0 ? 'text-blue-800' : 'text-gray-900'}`}>
                          {day.condition}
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          {day.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      {/* Temperature */}
                      <div className="flex items-center gap-1 text-gray-700">
                        <Thermometer className="w-4 h-4 text-red-500" />
                        <span className="font-medium">{day.temp}°C</span>
                      </div>
                      
                      {/* Humidity */}
                      {day.humidity && (
                        <div className="flex items-center gap-1 text-gray-700">
                          <Droplets className="w-4 h-4 text-blue-500" />
                          <span>{day.humidity}%</span>
                        </div>
                      )}
                      
                      {/* Wind */}
                      {day.windSpeed && (
                        <div className="flex items-center gap-1 text-gray-700">
                          <Wind className="w-4 h-4 text-gray-500" />
                          <span>{day.windSpeed} km/h</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t text-xs text-gray-500 text-center">
          Weather data provided by WeatherAPI.com • Forecast accuracy may vary
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WeatherForecastDialog;