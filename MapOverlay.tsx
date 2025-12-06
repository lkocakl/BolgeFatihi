import React, { memo } from 'react';
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
    handleRoutePress: (route: ConqueredRoute) => void;
    getRouteMidpoint: (coords: Coordinate[]) => Coordinate;
    userActiveColor?: string;
}

// 1. KATMAN: Fethedilmiş Bölgeler (Statik)
// Bu katman sadece 'visibleRoutes' veya seçim değiştiğinde render olur.
// Kullanıcı koşarken (routeCoordinates değiştiğinde) TEKRAR RENDER OLMAZ.
const ConqueredRegionsLayer = memo(({
    visibleRoutes,
    userId,
    selectedRoute,
    handleRoutePress,
    getRouteMidpoint,
    userActiveColor
}: Omit<MapOverlayProps, 'routeCoordinates'>) => {

    return (
        <>
            {visibleRoutes.map((route) => {
                const isOwner = route.ownerId === userId;
                const isSelected = selectedRoute?.id === route.id;

                const fillColor = isOwner
                    ? (userActiveColor + '40')
                    : 'rgba(255, 0, 0, 0.2)'; // Başkasının bölgesi kırmızımsı

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
                                title={isOwner ? "Senin Bölgen" : (route.ownerName || 'Bilinmeyen Fatih')}
                                description={`Puan: ${route.gaspScore}`}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </>
    );
}, (prevProps, nextProps) => {
    // Performans için özel karşılaştırma
    return (
        prevProps.visibleRoutes === nextProps.visibleRoutes &&
        prevProps.selectedRoute === nextProps.selectedRoute &&
        prevProps.userActiveColor === nextProps.userActiveColor &&
        prevProps.userId === nextProps.userId
    );
});

// 2. KATMAN: Aktif Rota (Dinamik)
// Sadece kullanıcı hareket ettiğinde render olur.
const ActiveRouteLayer = memo(({
    routeCoordinates,
    userActiveColor
}: {
    routeCoordinates: Coordinate[],
    userActiveColor: string
}) => {
    if (routeCoordinates.length === 0) return null;

    return (
        <Polyline
            coordinates={routeCoordinates}
            strokeWidth={8}
            strokeColor={userActiveColor}
            zIndex={100}
            lineCap="round"
            lineDashPattern={Platform.OS === 'android' ? [5, 20] : [0, 15]}
        />
    );
});

// Ana Bileşen
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
            <ConqueredRegionsLayer
                visibleRoutes={visibleRoutes}
                userId={userId}
                selectedRoute={selectedRoute}
                handleRoutePress={handleRoutePress}
                getRouteMidpoint={getRouteMidpoint}
                userActiveColor={userActiveColor}
            />

            <ActiveRouteLayer
                routeCoordinates={routeCoordinates}
                userActiveColor={userActiveColor}
            />
        </>
    );
};

export default memo(MapOverlay);