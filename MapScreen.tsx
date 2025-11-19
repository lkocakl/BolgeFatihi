import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Alert } from 'react-native';
import MapView, { Polyline, Marker, Region } from 'react-native-maps';
import * as turf from '@turf/turf';
import * as Haptics from 'expo-haptics';

import {
    collection, addDoc, serverTimestamp, doc, Timestamp,
    getDoc, updateDoc, GeoPoint
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from './AuthContext';
import { geohashForLocation } from 'geofire-common';

import { calculateRouteDistance, Coordinate } from './utils';
import { useRouteTracker } from './hooks/useRouteTracker';
import { useRouteFetcher, ConqueredRoute } from './hooks/useRouteFetcher';
import { useUserMap } from './hooks/useUserMap';
import { useOfflineRoutes } from './hooks/useOfflineRoutes';
import MapOverlay from './components/MapOverlay';
import TrackingControls from './components/TrackingControls';
import CustomAlert from './components/CustomAlert';

// --- TURF.JS TABANLI GASP KONTROLÜ ---
const BUFFER_METERS = 10;

const coordsToLineString = (coords: Coordinate[]): any | null => {
    if (coords.length < 2) return null;
    const coordinates = coords.map(c => [c.longitude, c.latitude]);
    return turf.lineString(coordinates);
};

const checkTurfIntersection = (newRouteCoords: Coordinate[], oldRouteCoords: Coordinate[]): boolean => {
    const newRouteLine = coordsToLineString(newRouteCoords);
    const oldRouteLine = coordsToLineString(oldRouteCoords);

    if (!newRouteLine || !oldRouteLine) return false;

    try {
        const newRouteBuffer = turf.buffer(newRouteLine, BUFFER_METERS, { units: 'meters' });
        const oldRouteBuffer = turf.buffer(oldRouteLine, BUFFER_METERS, { units: 'meters' });

        if (!newRouteBuffer || !oldRouteBuffer) {
            console.log("Turf buffer oluşturulamadı.");
            return false;
        }

        return turf.booleanIntersects(newRouteBuffer, oldRouteBuffer);
    } catch (error) {
        console.error("Turf.js kesişim hatası:", error);
        return false;
    }
};

const formatDuration = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}`;
};

const isRouteInViewport = (coords: Coordinate[], region: Region): boolean => {
    const latDelta = region.latitudeDelta;
    const lngDelta = region.longitudeDelta;
    const minLat = region.latitude - latDelta / 2;
    const maxLat = region.latitude + latDelta / 2;
    const minLng = region.longitude - lngDelta / 2;
    const maxLng = region.longitude + lngDelta / 2;
    return coords.some(coord =>
        coord.latitude >= minLat &&
        coord.latitude <= maxLat &&
        coord.longitude >= minLng &&
        coord.longitude <= maxLng
    );
};

const getRouteMidpoint = (coords: Coordinate[]): Coordinate => {
    if (coords.length === 0) return { latitude: 0, longitude: 0 };
    const midIndex = Math.floor(coords.length / 2);
    return coords[midIndex];
}

const MapScreen = () => {
    const { user } = useAuth();
    const navigation = useNavigation();
    const userId = user?.uid || "";

    // Custom Hooks
    const {
        isTracking,
        routeCoordinates,
        runDuration,
        currentLocation,
        errorMsg,
        isBackgroundTracking,
        startTracking,
        stopTracking,
        resetTracking
    } = useRouteTracker();

    const {
        conqueredRoutes,
        setConqueredRoutes,
        isFetchingRoutes,
        loadRoutesForRegion
    } = useRouteFetcher();

    const { userMap } = useUserMap();
    const { saveRouteOffline, syncRoutes } = useOfflineRoutes();

    // Local State
    const [visibleRoutes, setVisibleRoutes] = useState<ConqueredRoute[]>([]);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [selectedRoute, setSelectedRoute] = useState<ConqueredRoute | null>(null);

    // Alert State
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ title: string, message: string, type: 'success' | 'error' | 'warning' }>({
        title: '',
        message: '',
        type: 'warning'
    });

    const currentRegionRef = useRef<Region | null>(null);
    const MIN_DISTANCE_KM = 0.1;

    // Sync offline routes on mount
    useEffect(() => {
        syncRoutes();
    }, []);

    // Handle Region Change
    const onRegionChangeComplete = useCallback((region: Region) => {
        currentRegionRef.current = region;
        loadRoutesForRegion(region);
        setVisibleRoutes(
            conqueredRoutes.filter(route => isRouteInViewport(route.coords, region))
        );
    }, [conqueredRoutes, loadRoutesForRegion]);

    // Update visible routes when conqueredRoutes changes
    useEffect(() => {
        if (currentRegionRef.current) {
            setVisibleRoutes(
                conqueredRoutes.filter(route => isRouteInViewport(route.coords, currentRegionRef.current!))
            );
        }
    }, [conqueredRoutes]);

    const showAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' = 'warning') => {
        setAlertConfig({ title, message, type });
        setAlertVisible(true);
    };

    const handleToggleTracking = async () => {
        if (isTracking) {
            // STOPPING & SAVING
            setIsSaving(true);
            try {
                const { coords: finalCoords, duration } = await stopTracking();
                const distanceKm = calculateRouteDistance(finalCoords);

                if (distanceKm < MIN_DISTANCE_KM) {
                    showAlert("Çok Kısa", `Minimum rota uzunluğu ${MIN_DISTANCE_KM * 1000} metredir. Bu rota kaydedilmeyecek.`, 'warning');
                    await resetTracking();
                    return;
                }

                // Gasp Logic
                const gaspedRoutes: string[] = [];
                const routesToCheck = conqueredRoutes.filter(r => r.ownerId !== userId);

                for (const route of routesToCheck) {
                    if (checkTurfIntersection(finalCoords, route.coords)) {
                        gaspedRoutes.push(route.id);
                    }
                }

                const baseScore = Math.floor(distanceKm * 10);
                const durationInSeconds = Math.floor(duration / 1000);
                const geoPoints = finalCoords.map(c => new GeoPoint(c.latitude, c.longitude));

                let routeGeohash = "none";
                if (finalCoords.length > 0) {
                    const startPoint = finalCoords[0];
                    routeGeohash = geohashForLocation([startPoint.latitude, startPoint.longitude]);
                }

                try {
                    const newDocRef = await addDoc(collection(db, "routes"), {
                        userId: userId,
                        ownerId: userId,
                        coords: geoPoints,
                        claimedAt: serverTimestamp(),
                        gaspScore: baseScore,
                        baseScore: baseScore,
                        distanceKm: parseFloat(distanceKm.toFixed(2)),
                        durationSeconds: durationInSeconds,
                        gaspedRoutes: gaspedRoutes,
                        geohash: routeGeohash
                    });

                    // Handle Gasped Routes
                    if (gaspedRoutes.length > 0) {
                        for (const routeId of gaspedRoutes) {
                            const routeToGaspRef = doc(db, "routes", routeId);
                            const routeDocSnap = await getDoc(routeToGaspRef);
                            if (routeDocSnap.exists()) {
                                const routeData = routeDocSnap.data();
                                const currentGaspScore = routeData.gaspScore || routeData.baseScore || 10;
                                const newGaspScore = Math.max(Math.floor(currentGaspScore * 1.2), currentGaspScore + 5);

                                await updateDoc(routeToGaspRef, {
                                    ownerId: userId,
                                    claimedAt: serverTimestamp(),
                                    gaspScore: newGaspScore
                                });

                                // Optimistic Update
                                setConqueredRoutes(prev => prev.map(r =>
                                    r.id === routeId ? { ...r, ownerId: userId, gaspScore: newGaspScore } : r
                                ));
                            }
                        }
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        showAlert("Bölge Fethedildi!", `Ek olarak ${gaspedRoutes.length} adet rakip bölgeyi ele geçirdin!`, 'success');
                    } else {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        showAlert("Bölge Fethedildi!", `Mesafe: ${distanceKm.toFixed(2)} KM\nPuan: ${baseScore}`, 'success');
                    }

                    // Optimistic Add
                    const newRoute: ConqueredRoute = {
                        id: newDocRef.id,
                        ownerId: userId,
                        coords: finalCoords,
                        distanceKm: parseFloat(distanceKm.toFixed(2)),
                        gaspScore: baseScore,
                        claimedAt: Timestamp.now(),
                        durationSeconds: durationInSeconds,
                        geohash: routeGeohash
                    };
                    setConqueredRoutes(prev => [...prev, newRoute]);

                } catch (firestoreError) {
                    console.error("Firestore save error, saving offline:", firestoreError);
                    await saveRouteOffline({
                        userId,
                        coords: finalCoords,
                        distanceKm: parseFloat(distanceKm.toFixed(2)),
                        durationSeconds: durationInSeconds,
                        timestamp: Date.now(),
                        gaspScore: baseScore,
                        baseScore: baseScore,
                        geohash: routeGeohash,
                        gaspedRoutes
                    });
                    showAlert("Çevrimdışı Kayıt", "Rota internet bağlantısı olmadığı için cihaza kaydedildi.", 'warning');
                }

                await resetTracking();

            } catch (e) {
                console.error("Save error:", e);
                showAlert("Hata", "Rota kaydedilemedi.", 'error');
            } finally {
                setIsSaving(false);
            }
        } else {
            // STARTING
            if (!userId) {
                Alert.alert("Giriş Gerekli", "Lütfen giriş yapın.", [
                    { text: "Giriş", onPress: () => (navigation as any).navigate('AuthModal') },
                    { text: "İptal", style: 'cancel' }
                ]);
                return;
            }

            try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                const started = await startTracking();
                if (!started) {
                    console.log("Tracking could not start");
                }
            } catch (error) {
                console.error("Start tracking error:", error);
                showAlert("Hata", "Takip başlatılamadı: " + (error as any).message, 'error');
            }
        }
    };

    if (errorMsg) {
        return (<View style={styles.centerContainer}><Text style={styles.errorText}>{errorMsg}</Text></View>);
    }

    if (!currentLocation) {
        return (<View style={styles.centerContainer}><ActivityIndicator size="large" color="#388E3C" /><Text style={styles.text}>Konum yükleniyor...</Text></View>);
    }

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                showsUserLocation={true}
                followsUserLocation={isTracking}
                loadingEnabled={true}
                onRegionChangeComplete={onRegionChangeComplete}
                onPress={() => setSelectedRoute(null)}
            >
                <MapOverlay
                    routeCoordinates={routeCoordinates}
                    visibleRoutes={visibleRoutes}
                    userId={userId}
                    selectedRoute={selectedRoute}
                    userMap={userMap}
                    handleRoutePress={setSelectedRoute}
                    getRouteMidpoint={getRouteMidpoint}
                />
            </MapView>

            {isFetchingRoutes && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color="#388E3C" />
                    <Text style={styles.loadingText}>Rotalar yükleniyor</Text>
                </View>
            )}

            {isBackgroundTracking && (
                <View style={styles.backgroundTrackingIndicator}>
                    <Text style={styles.backgroundTrackingText}>
                        📍 Arka plan takibi aktif
                    </Text>
                </View>
            )}

            <TrackingControls
                isTracking={isTracking}
                isSaving={isSaving}
                runDuration={runDuration}
                distanceKm={calculateRouteDistance(routeCoordinates)}
                onToggleTracking={handleToggleTracking}
                formatDuration={formatDuration}
            />

            <CustomAlert
                visible={alertVisible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={() => setAlertVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    map: { flex: 1 },
    text: { marginTop: 20, fontSize: 16, color: '#757575' },
    errorText: { fontSize: 16, color: '#D32F2F', textAlign: 'center' },
    loadingOverlay: {
        position: 'absolute', top: 60, right: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 20, padding: 5, paddingHorizontal: 10,
        flexDirection: 'row', alignItems: 'center', zIndex: 100,
        elevation: 3,
    },
    loadingText: { marginLeft: 5, color: '#424242', fontSize: 12, fontWeight: 'bold' },
    backgroundTrackingIndicator: {
        position: 'absolute',
        top: 120,
        left: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#388E3C',
        zIndex: 90,
        elevation: 3,
    },
    backgroundTrackingText: {
        fontSize: 12,
        color: '#388E3C',
        fontWeight: 'bold',
    },
});

export default MapScreen;