import React from 'react';
import { Polyline, Polygon, Marker } from 'react-native-maps';
import { Coordinate } from '../utils';
import { ConqueredRoute } from '../hooks/useRouteFetcher';
import { COLORS } from '../constants/theme';
import { Platform } from 'react-native';

interface MapOverlayProps {
    routeCoordinates: Coordinate[];
    visibleRoutes: ConqueredRoute[];
    userId: string;
    selectedRoute: ConqueredRoute | null;
    // [DEĞİŞİKLİK] userMap artık gerekmiyor, kaldırdık
    handleRoutePress: (route: ConqueredRoute) => void;
    getRouteMidpoint: (coords: Coordinate[]) => Coordinate;
    userActiveColor?: string;
}

const MapOverlay = ({
    routeCoordinates,
    visibleRoutes,
    userId,
    selectedRoute,
    handleRoutePress,
    getRouteMidpoint,
    userActiveColor = COLORS.primary
}: MapOverlayProps) => {
    return (
        <>
            {/* Fethedilmiş Rotalar (Bölgeler) */}
            {visibleRoutes.map((route) => {
                const isOwner = route.ownerId === userId;
                const isSelected = selectedRoute?.id === route.id;

                const fillColor = isOwner
                    ? (userActiveColor + '40')
                    : 'rgba(255, 0, 0, 0.2)';

                const strokeColor = isOwner
                    ? userActiveColor
                    : 'rgba(255, 0, 0, 0.5)';

                return (
                    <React.Fragment key={route.id}>
                        <Polygon
                            coordinates={route.coords}
                            strokeWidth={isSelected ? 3 : 1}
                            strokeColor={strokeColor}
                            fillColor={isSelected ? 'rgba(255, 255, 0, 0.4)' : fillColor}
                            tappable={true}
                            onPress={() => handleRoutePress(route)}
                            zIndex={isSelected ? 2 : 1}
                        />
                        {isSelected && (
                            <Marker
                                coordinate={getRouteMidpoint(route.coords)}
                                // [YENİ] İsmi doğrudan rotadan alıyoruz
                                title={isOwner ? "Senin Bölgen" : (route.ownerName || 'Bilinmeyen Fatih')}
                                description={`Puan: ${route.gaspScore}`}
                            />
                        )}
                    </React.Fragment>
                );
            })}

            {/* Aktif Koşu Rotası */}
            {routeCoordinates.length > 0 && (
                <Polyline
                    coordinates={routeCoordinates}
                    strokeWidth={8}
                    strokeColor={userActiveColor}
                    zIndex={100}
                    lineCap="round"
                    lineDashPattern={Platform.OS === 'android' ? [5, 20] : [0, 15]}
                />
            )}
        </>
    );
};

export default MapOverlay;