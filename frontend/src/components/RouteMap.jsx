import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Target } from 'lucide-react';

// Fix for default markers not showing in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  iconRetinaUrl: iconRetina,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Map control component to handle bounds and zooming
function MapController({ userRoute, posts, skipAutoFit = false }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map || skipAutoFit) return;
    
    // Use map's whenReady to ensure it's fully initialized
    const handleMapReady = () => {
      try {
        // Check if map and container still exist and are ready
        if (!map || !map.getContainer() || !map.getContainer().offsetParent) {
          return;
        }

        // Only auto-fit on initial load, not when manually zooming
        if (map.getZoom() !== 11) {
          return;
        }

        // Auto-fit map to show all relevant points (without distance circles for now)
        const bounds = [];
        
        // Add user route points
        if (userRoute?.start) {
          bounds.push([userRoute.start.lat, userRoute.start.lng]);
        }
        if (userRoute?.end) {
          bounds.push([userRoute.end.lat, userRoute.end.lng]);
        }
        
        // Add post points
        posts.forEach(post => {
          if (post.trip?.startLocation?.gps_coordinates) {
            bounds.push([
              post.trip.startLocation.gps_coordinates.latitude,
              post.trip.startLocation.gps_coordinates.longitude
            ]);
          }
          if (post.trip?.endLocation?.gps_coordinates) {
            bounds.push([
              post.trip.endLocation.gps_coordinates.latitude,
              post.trip.endLocation.gps_coordinates.longitude
            ]);
          }
        });
        
        if (bounds.length > 0) {
          const leafletBounds = L.latLngBounds(bounds);
          // Additional checks for valid bounds and map state
          if (leafletBounds.isValid() && map._loaded && !map._animatingZoom) {
            // Use setTimeout to avoid DOM timing conflicts
            setTimeout(() => {
              try {
                if (map && map.getContainer() && !map._animatingZoom) {
                  map.fitBounds(leafletBounds, { 
                    padding: [20, 20], // Reduced padding for tighter fit
                    animate: false,  // Disable animation to prevent DOM issues
                    maxZoom: 15      // Don't zoom out too far when fitting bounds
                  });
                }
              } catch (animError) {
                // Animation error ignored
              }
            }, 100);
          }
        }
      } catch (error) {
        // Error fitting bounds ignored
      }
    };

    // Add multiple safety checks for map readiness
    if (map && map.getContainer()) {
      if (map._loaded) {
        handleMapReady();
      } else {
        // Wait for map to be ready with timeout fallback
        const readyTimeout = setTimeout(() => {
          // Map ready timeout
        }, 3000);
        
        map.whenReady(() => {
          clearTimeout(readyTimeout);
          handleMapReady();
        });
      }
    }
  }, [map, userRoute, posts, skipAutoFit]);
  
  return null;
}

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons for different types of points
const createCustomIcon = (color, type) => {
  const svgIcon = `
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 12.5 12.5 28.5 12.5 28.5s12.5-16 12.5-28.5C25 5.6 19.4 0 12.5 0z" fill="${color}"/>
      <circle cx="12.5" cy="12.5" r="8" fill="#fff"/>
      <text x="12.5" y="17" text-anchor="middle" font-size="10" font-weight="bold" fill="${color}">${type}</text>
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: 'custom-marker',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });
};

// Calculate distance between two coordinates (Haversine formula)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

function RouteMap({ 
  userRoute = null, 
  posts = [], 
  searchRadius = 10,
  onMapReady = null,
  className = "h-96",
  showZoomControls = false,
  skipAutoFit = false
}) {
  const mapRef = useRef(null);

  // Zoom control functions that directly use the map ref
  const handleZoomToStart = () => {
    try {
      if (mapRef.current && userRoute?.start) {
        if (posts.length > 0) {
          // Create bounds to show both user start and post start with good separation
          const firstPost = posts[0];
          const bounds = [];
          bounds.push([userRoute.start.lat, userRoute.start.lng]);
          
          if (firstPost.trip?.startLocation?.gps_coordinates) {
            bounds.push([
              firstPost.trip.startLocation.gps_coordinates.latitude,
              firstPost.trip.startLocation.gps_coordinates.longitude
            ]);
          }
          
          if (bounds.length > 1) {
            const leafletBounds = L.latLngBounds(bounds);
            if (leafletBounds.isValid()) {
              // Ensure map is loaded before operating on it
              if (mapRef.current._loaded && mapRef.current.fitBounds) {
                mapRef.current.fitBounds(leafletBounds, { 
                  padding: [80, 80], // Good padding for pin separation
                  maxZoom: 18 // Allow very close zoom when pins are geographically close
                });
              } else if (mapRef.current.whenReady) {
                mapRef.current.whenReady(() => {
                  mapRef.current.fitBounds(leafletBounds, { 
                    padding: [80, 80],
                    maxZoom: 18
                  });
                });
              }
              return;
            }
          }
        }
        
        // Fallback: just center on user start with reasonable zoom
        const zoomLevel = 16; // Good detail level for pin visibility
        if (mapRef.current._loaded && mapRef.current.setView) {
          mapRef.current.setView([userRoute.start.lat, userRoute.start.lng], zoomLevel);
        } else if (mapRef.current.whenReady) {
          mapRef.current.whenReady(() => {
            mapRef.current.setView([userRoute.start.lat, userRoute.start.lng], zoomLevel);
          });
        }
      }
    } catch (error) {
      // Error zooming to start ignored
    }
  };

  const handleZoomToEnd = () => {
    try {
      if (mapRef.current && userRoute?.end) {
        if (posts.length > 0) {
          // Create bounds to show both user end and post end with good separation
          const firstPost = posts[0];
          const bounds = [];
          bounds.push([userRoute.end.lat, userRoute.end.lng]);
          
          if (firstPost.trip?.endLocation?.gps_coordinates) {
            bounds.push([
              firstPost.trip.endLocation.gps_coordinates.latitude,
              firstPost.trip.endLocation.gps_coordinates.longitude
            ]);
          }
          
          if (bounds.length > 1) {
            const leafletBounds = L.latLngBounds(bounds);
            if (leafletBounds.isValid()) {
              // Ensure map is loaded before operating on it
              if (mapRef.current._loaded && mapRef.current.fitBounds) {
                mapRef.current.fitBounds(leafletBounds, { 
                  padding: [80, 80], // Good padding for pin separation
                  maxZoom: 18 // Allow very close zoom when pins are geographically close
                });
              } else if (mapRef.current.whenReady) {
                mapRef.current.whenReady(() => {
                  mapRef.current.fitBounds(leafletBounds, { 
                    padding: [80, 80],
                    maxZoom: 18
                  });
                });
              }
              return;
            }
          }
        }
        
        // Fallback: just center on user end with reasonable zoom
        const zoomLevel = 16; // Good detail level for pin visibility
        if (mapRef.current._loaded && mapRef.current.setView) {
          mapRef.current.setView([userRoute.end.lat, userRoute.end.lng], zoomLevel);
        } else if (mapRef.current.whenReady) {
          mapRef.current.whenReady(() => {
            mapRef.current.setView([userRoute.end.lat, userRoute.end.lng], zoomLevel);
          });
        }
      }
    } catch (error) {
      // Error zooming to end ignored
    }
  };

  const handleFitRoute = () => {
    try {
      if (mapRef.current && userRoute) {
        const bounds = [];
        if (userRoute.start) bounds.push([userRoute.start.lat, userRoute.start.lng]);
        if (userRoute.end) bounds.push([userRoute.end.lat, userRoute.end.lng]);
        if (bounds.length > 0) {
          const leafletBounds = L.latLngBounds(bounds);
          if (leafletBounds.isValid()) {
            // Ensure map is loaded before operating on it
            if (mapRef.current._loaded && mapRef.current.fitBounds) {
              mapRef.current.fitBounds(leafletBounds, { padding: [20, 20] });
            } else if (mapRef.current.whenReady) {
              mapRef.current.whenReady(() => {
                mapRef.current.fitBounds(leafletBounds, { padding: [20, 20] });
              });
            }
          }
        }
      }
    } catch (error) {
      // Error fitting route ignored
    }
  };

  // Default center (Baltimore, MD area)
  const defaultCenter = [39.2904, -76.6122];
  const defaultZoom = 11;

  // Calculate map center and bounds
  const getMapCenter = () => {
    if (userRoute?.center) {
      return [userRoute.center.lat, userRoute.center.lng];
    }
    return defaultCenter;
  };

  // Calculate distances for a post
  const getPostDistances = (post) => {
    if (!userRoute || !post.trip) return null;
    
    const distances = {};
    
    // Start distance
    if (userRoute.start && post.trip.startLocation?.gps_coordinates) {
      distances.startDistance = calculateDistance(
        userRoute.start.lat,
        userRoute.start.lng,
        post.trip.startLocation.gps_coordinates.latitude,
        post.trip.startLocation.gps_coordinates.longitude
      );
    }
    
    // End distance
    if (userRoute.end && post.trip.endLocation?.gps_coordinates) {
      distances.endDistance = calculateDistance(
        userRoute.end.lat,
        userRoute.end.lng,
        post.trip.endLocation.gps_coordinates.latitude,
        post.trip.endLocation.gps_coordinates.longitude
      );
    }

    return distances;
  };

  // Calculate appropriate zoom level based on distance circle radius
  const getZoomForDistance = (distanceKm) => {
    // Higher zoom levels for closer view: 18 = very close, 17 = close, 16 = medium, etc.
    if (distanceKm <= 0.3) return 18;      // Very close - street level
    if (distanceKm <= 0.6) return 17;      // Close - neighborhood level
    if (distanceKm <= 1.2) return 16;      // Medium close
    if (distanceKm <= 2.5) return 15;      // Medium
    if (distanceKm <= 5) return 14;        // Far
    if (distanceKm <= 10) return 13;       // Very far
    return 12;                             // Very far or no data
  };

  return (
    <>
      {/* Ensure map elements stay below dialog overlays */}
      <style>{`
        .leaflet-container, 
        .leaflet-pane,
        .leaflet-control-container,
        .leaflet-popup-pane,
        .leaflet-marker-pane,
        .leaflet-tooltip-pane {
          z-index: 10 !important;
        }
      `}</style>
      <div className="space-y-3">
        {/* Zoom Controls */}
        {showZoomControls && userRoute && (
          <div className="flex gap-2 justify-center">
            {userRoute.start && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomToStart}
                className="flex items-center gap-1"
              >
                <Navigation className="w-4 h-4" />
                Zoom to Start
              </Button>
            )}
            {userRoute.end && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomToEnd}
                className="flex items-center gap-1"
              >
                <Target className="w-4 h-4" />
                Zoom to Destination
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleFitRoute}
              className="flex items-center gap-1"
            >
              <MapPin className="w-4 h-4" />
              Fit Route
            </Button>
          </div>
        )}
        
        <div className={`w-full ${className} rounded-lg border border-gray-200 overflow-hidden relative`} style={{ zIndex: 10 }}>
        <MapContainer
          center={getMapCenter()}
          zoom={defaultZoom}
          scrollWheelZoom={true}
          className="h-full w-full"
          style={{ zIndex: 10 }}
          ref={mapRef}
          whenCreated={(mapInstance) => {
            mapRef.current = mapInstance;
            onMapReady?.(mapInstance);
          }}
        >
          {/* Map Controller for auto-fit bounds and zoom control */}
          <MapController 
            userRoute={userRoute}
            posts={posts}
            skipAutoFit={skipAutoFit}
          />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User Route Markers and Distance Circles */}
        {userRoute?.start && (
          <>
            <Marker 
              position={[userRoute.start.lat, userRoute.start.lng]}
              icon={createCustomIcon('#10B981', 'S')}
            >
              <Popup>
                <div className="font-medium">Your Start Location</div>
                <div className="text-sm">{userRoute.start.title}</div>
              </Popup>
            </Marker>
            
            {/* Distance circle around start - shows search radius */}
            <Circle
              center={[userRoute.start.lat, userRoute.start.lng]}
              radius={searchRadius * 1000} // Convert km to meters
              pathOptions={{
                color: '#10B981',
                fillColor: '#10B981',
                fillOpacity: 0.1,
                weight: 2
              }}
            />
          </>
        )}

        {userRoute?.end && (
          <>
            <Marker 
              position={[userRoute.end.lat, userRoute.end.lng]}
              icon={createCustomIcon('#EF4444', 'E')}
            >
              <Popup>
                <div className="font-medium">Your End Location</div>
                <div className="text-sm">{userRoute.end.title}</div>
              </Popup>
            </Marker>
            
            {/* Distance circle around end - shows search radius */}
            <Circle
              center={[userRoute.end.lat, userRoute.end.lng]}
              radius={searchRadius * 1000} // Convert km to meters
              pathOptions={{
                color: '#EF4444',
                fillColor: '#EF4444',
                fillOpacity: 0.1,
                weight: 2
              }}
            />
          </>
        )}

        {/* User route line */}
        {userRoute?.start && userRoute?.end && (
          <Polyline
            positions={[
              [userRoute.start.lat, userRoute.start.lng],
              [userRoute.end.lat, userRoute.end.lng]
            ]}
            pathOptions={{
              color: '#3B82F6',
              weight: 3,
              opacity: 0.8
            }}
          />
        )}

        {/* Post Markers and Distance Lines */}
        {posts.map((post) => {
          const postDistances = getPostDistances(post);
          const isOffer = post.type === 'offer';
          const postColor = isOffer ? '#8B5CF6' : '#F59E0B';
          
          return (
            <div key={post._id}>
              {/* Start Location Marker */}
              {post.trip?.startLocation?.gps_coordinates && (
                <Marker
                  position={[
                    post.trip.startLocation.gps_coordinates.latitude,
                    post.trip.startLocation.gps_coordinates.longitude
                  ]}
                  icon={createCustomIcon(postColor, isOffer ? 'OS' : 'RS')}
                >
                  <Popup>
                    <div className="space-y-2">
                      <div className="font-medium">
                        {isOffer ? 'Offering' : 'Requesting'} - Start
                      </div>
                      <div className="text-sm font-medium">{post.title}</div>
                      <div className="text-sm">{post.trip.startLocation.title}</div>
                      <div className="text-xs text-gray-600">By: {post.user.name}</div>
                      {postDistances?.startDistance && (
                        <div className="text-xs text-blue-600 font-medium">
                          {postDistances.startDistance.toFixed(1)} km from your start
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* End Location Marker */}
              {post.trip?.endLocation?.gps_coordinates && (
                <Marker
                  position={[
                    post.trip.endLocation.gps_coordinates.latitude,
                    post.trip.endLocation.gps_coordinates.longitude
                  ]}
                  icon={createCustomIcon(postColor, isOffer ? 'OE' : 'RE')}
                >
                  <Popup>
                    <div className="space-y-2">
                      <div className="font-medium">
                        {isOffer ? 'Offering' : 'Requesting'} - End
                      </div>
                      <div className="text-sm font-medium">{post.title}</div>
                      <div className="text-sm">{post.trip.endLocation.title}</div>
                      <div className="text-xs text-gray-600">By: {post.user.name}</div>
                      {postDistances?.endDistance && (
                        <div className="text-xs text-blue-600 font-medium">
                          {postDistances.endDistance.toFixed(1)} km from your end
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Post route line */}
              {post.trip?.startLocation?.gps_coordinates && post.trip?.endLocation?.gps_coordinates && (
                <Polyline
                  positions={[
                    [
                      post.trip.startLocation.gps_coordinates.latitude,
                      post.trip.startLocation.gps_coordinates.longitude
                    ],
                    [
                      post.trip.endLocation.gps_coordinates.latitude,
                      post.trip.endLocation.gps_coordinates.longitude
                    ]
                  ]}
                  pathOptions={{
                    color: postColor,
                    weight: 2,
                    opacity: 0.6,
                    dashArray: '5, 5'
                  }}
                />
              )}

              {/* Distance lines from user route to post route */}
              {userRoute?.start && post.trip?.startLocation?.gps_coordinates && postDistances?.startDistance && (
                <Polyline
                  positions={[
                    [userRoute.start.lat, userRoute.start.lng],
                    [
                      post.trip.startLocation.gps_coordinates.latitude,
                      post.trip.startLocation.gps_coordinates.longitude
                    ]
                  ]}
                  pathOptions={{
                    color: '#6B7280',
                    weight: 1,
                    opacity: 0.4,
                    dashArray: '2, 4'
                  }}
                />
              )}

              {userRoute?.end && post.trip?.endLocation?.gps_coordinates && postDistances?.endDistance && (
                <Polyline
                  positions={[
                    [userRoute.end.lat, userRoute.end.lng],
                    [
                      post.trip.endLocation.gps_coordinates.latitude,
                      post.trip.endLocation.gps_coordinates.longitude
                    ]
                  ]}
                  pathOptions={{
                    color: '#6B7280',
                    weight: 1,
                    opacity: 0.4,
                    dashArray: '2, 4'
                  }}
                />
              )}
            </div>
          );
        })}
      </MapContainer>
        </div>
      </div>
    </>
  );
}

export default RouteMap;