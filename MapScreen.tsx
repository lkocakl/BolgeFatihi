import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Modal, ScrollView as GenericScrollView, Platform } from 'react-native';
import MapView, { Region, PROVIDER_GOOGLE } from 'react-native-maps';
import * as turf from '@turf/turf';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import {
    collection, doc, serverTimestamp, GeoPoint,
    getDoc, writeBatch, increment, Timestamp, onSnapshot
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { useAuth, Quest } from './AuthContext';
import { geohashForLocation } from 'geofire-common';

import LocationPermissionModal from './components/LocationPermissionModal';
import * as Location from 'expo-location';
import { calculateRouteDistance, Coordinate, sendPushNotification, getLocalISOString, shareImage, calculateDistance } from './utils';
import { useRouteTracker } from './hooks/useRouteTracker';
import { useRouteFetcher, ConqueredRoute } from './hooks/useRouteFetcher';
import { useOfflineRoutes } from './hooks/useOfflineRoutes';
import MapOverlay from './components/MapOverlay';
import TrackingControls from './components/TrackingControls';
import { useAlert } from './AlertContext';
import { COLORS, SHADOWS } from './constants/theme';
import { useTheme } from './ThemeContext';
import { generateDailyQuests, updateQuestProgress } from './QuestSystem';
import { useTranslation } from 'react-i18next';

// --- TURF.JS & YARDIMCI FONKSİYONLAR ---

const BUFFER_METERS = 15;
const PATH_WIDTH_KM = 0.02; // 20 metre yarıçap

// Rotayı "Sosis" şekline (Poligona) çeviren fonksiyon
const createBufferedRoutePolygon = (coords: Coordinate[]): Coordinate[] => {
    if (!coords || coords.length < 2) return coords;

    try {
        const lineCoords = coords.map(c => [c.longitude, c.latitude]);
        const line = turf.lineString(lineCoords);

        const buffered = turf.buffer(line, PATH_WIDTH_KM, { units: 'kilometers' });

        if (!buffered || !buffered.geometry) return coords;

        const geometry = buffered.geometry;
        let polygonRing: any[] = [];

        if (geometry.type === 'Polygon') {
            polygonRing = geometry.coordinates[0];
        } else if (geometry.type === 'MultiPolygon') {
            polygonRing = geometry.coordinates[0][0];
        }

        if (!polygonRing || polygonRing.length === 0) return coords;

        return polygonRing.map((p: any) => ({
            latitude: p[1],
            longitude: p[0]
        }));
    } catch (error) {
        console.error("Buffer oluşturma hatası:", error);
        return coords;
    }
};

const coordsToLineString = (coords: Coordinate[]): any | null => {
    if (!coords || coords.length < 2) return null;
    const coordinates = coords.map(c => [c.longitude, c.latitude]);
    return turf.lineString(coordinates);
};

const checkTurfIntersection = (newRouteCoords: Coordinate[], targetRouteCoords: Coordinate[]): boolean => {
    const newRouteLine = coordsToLineString(newRouteCoords);
    if (!newRouteLine) return false;

    try {
        const newRouteBuffer = turf.buffer(newRouteLine, BUFFER_METERS, { units: 'meters' });
        if (!newRouteBuffer) return false;

        // Hedef rotanın kapalı bir poligon olup olmadığını kontrol et
        const isClosedPolygon =
            targetRouteCoords.length > 3 &&
            Math.abs(targetRouteCoords[0].latitude - targetRouteCoords[targetRouteCoords.length - 1].latitude) < 0.00001 &&
            Math.abs(targetRouteCoords[0].longitude - targetRouteCoords[targetRouteCoords.length - 1].longitude) < 0.00001;

        let targetGeometry;

        if (isClosedPolygon) {
            const polygonCoords = targetRouteCoords.map(c => [c.longitude, c.latitude]);
            targetGeometry = turf.polygon([polygonCoords]);
        } else {
            const targetLine = coordsToLineString(targetRouteCoords);
            if (!targetLine) return false;

            const targetBuffer = turf.buffer(targetLine, BUFFER_METERS, { units: 'meters' });
            if (!targetBuffer) return false;

            targetGeometry = targetBuffer;
        }

        return turf.booleanIntersects(newRouteBuffer, targetGeometry);

    } catch (error) {
        console.error("Turf.js kesişim hatası:", error);
        return false;
    }
};

// Gizlilik Alanı Filtreleme
const applyPrivacyZone = (coords: Coordinate[], privacyZone?: { latitude: number, longitude: number, radius: number, isEnabled: boolean }) => {
    if (!privacyZone || !privacyZone.isEnabled || coords.length < 2) return coords;

    let startIndex = 0;
    let endIndex = coords.length - 1;

    for (let i = 0; i < coords.length; i++) {
        const dist = calculateDistance(coords[i].latitude, coords[i].longitude, privacyZone.latitude, privacyZone.longitude);
        if (dist * 1000 > privacyZone.radius) {
            startIndex = i;
            break;
        }
    }

    for (let i = coords.length - 1; i >= 0; i--) {
        const dist = calculateDistance(coords[i].latitude, coords[i].longitude, privacyZone.latitude, privacyZone.longitude);
        if (dist * 1000 > privacyZone.radius) {
            endIndex = i;
            break;
        }
    }

    if (startIndex > endIndex) return [];

    return coords.slice(startIndex, endIndex + 1);
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
    if (!coords || coords.length === 0) return { latitude: 0, longitude: 0 };
    const midIndex = Math.floor(coords.length / 2);
    return coords[midIndex];
}

const DARK_MAP_STYLE = [
    { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
    { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
    { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
    { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
    { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
    { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
    { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
    { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
    { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
    { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];

const MapScreen = () => {
    const { user, userProfile } = useAuth();
    const navigation = useNavigation();
    const userId = user?.uid || "";
    const { showAlert } = useAlert();
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();

    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [activeColor, setActiveColor] = useState('#1E88E5');

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

    const { saveRouteOffline, syncRoutes } = useOfflineRoutes();

    const [visibleRoutes, setVisibleRoutes] = useState<ConqueredRoute[]>([]);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [selectedRoute, setSelectedRoute] = useState<ConqueredRoute | null>(null);

    const [questsVisible, setQuestsVisible] = useState(false);
    const [dailyQuests, setDailyQuests] = useState<Quest[]>([]);

    const currentRegionRef = useRef<Region | null>(null);
    const mapRef = useRef<MapView>(null);
    const MIN_DISTANCE_KM = 0.1;

    useEffect(() => {
        const doSync = async () => {
            const count = await syncRoutes();
            if (count > 0) {
                showAlert(t('common.success') as string, `${count} çevrimdışı rota başarıyla yüklendi!`, 'success');
            }
        };
        doSync();
    }, []);

    useEffect(() => {
        if (!userId) return;
        const userDocRef = doc(db, "users", userId);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.inventory?.activeColor) {
                    setActiveColor(data.inventory.activeColor);
                }
            }
        });
        return () => unsubscribe();
    }, [userId]);

    useEffect(() => {
        if (!user || !userProfile) return;

        const checkDailyQuests = async () => {
            const today = getLocalISOString();
            const lastDate = userProfile.lastQuestDate;

            if (lastDate !== today || !userProfile.dailyQuests) {
                const newQuests = generateDailyQuests();
                try {
                    const userRef = doc(db, "users", user.uid);
                    await writeBatch(db).update(userRef, {
                        dailyQuests: newQuests,
                        lastQuestDate: today
                    }).commit();
                    setDailyQuests(newQuests);
                } catch (e) {
                    console.error("Görev oluşturma hatası:", e);
                }
            } else {
                setDailyQuests(userProfile.dailyQuests);
            }
        };

        checkDailyQuests();
    }, [user, userProfile?.lastQuestDate]);

    const onRegionChangeComplete = useCallback((region: Region) => {
        currentRegionRef.current = region;
        loadRoutesForRegion(region);
        if (conqueredRoutes.length > 50) {
            setVisibleRoutes(
                conqueredRoutes.filter(route => isRouteInViewport(route.coords, region))
            );
        } else {
            setVisibleRoutes(conqueredRoutes);
        }
    }, [conqueredRoutes, loadRoutesForRegion]);

    useEffect(() => {
        if (currentRegionRef.current) {
            if (conqueredRoutes.length > 50) {
                setVisibleRoutes(
                    conqueredRoutes.filter(route => isRouteInViewport(route.coords, currentRegionRef.current!))
                );
            } else {
                setVisibleRoutes(conqueredRoutes);
            }
        } else {
            setVisibleRoutes(conqueredRoutes);
        }
    }, [conqueredRoutes]);

    const startRun = async () => {
        try {
            setShowPermissionModal(false);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const started = await startTracking();
            if (!started) { }
        } catch (error) {
            console.error("Start tracking error:", error);
            showAlert(t('common.error') as string, t('map.gpsError') as string, 'error');
        }
    };

    const handleShare = async () => {
        if (mapRef.current) {
            try {
                const uri = await mapRef.current.takeSnapshot({
                    format: 'png',
                    quality: 0.8,
                    result: 'file'
                });
                await shareImage(uri);
            } catch (e) {
                console.error("Snapshot hatası:", e);
                showAlert(t('common.error') as string, "Harita görüntüsü alınamadı.", 'error');
            }
        }
    };

    const applyShield = async () => {
        if (!selectedRoute || !user) return;

        const shieldCount = userProfile?.inventory?.shields || 0;

        if (shieldCount <= 0) {
            showAlert(t('common.warning') as string, t('shop.insufficientFunds') as string, 'warning');
            return;
        }

        const now = Date.now();
        const currentShield = selectedRoute.shieldUntil instanceof Timestamp
            ? selectedRoute.shieldUntil.toMillis()
            : 0;

        if (currentShield > now) {
            showAlert(t('common.warning') as string, t('map.shieldActive') as string, 'warning');
            return;
        }

        showAlert(
            t('map.shieldActive') as string,
            t('map.shieldMsg') as string,
            "warning",
            [
                { text: t('common.cancel') as string, style: "cancel" },
                {
                    text: t('shop.use') as string,
                    onPress: async () => {
                        try {
                            const batch = writeBatch(db);
                            const routeRef = doc(db, "routes", selectedRoute.id);
                            const userRef = doc(db, "users", user.uid);

                            const shieldUntilDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
                            const shieldTimestamp = Timestamp.fromDate(shieldUntilDate);

                            batch.update(routeRef, { shieldUntil: shieldTimestamp });
                            batch.update(userRef, { "inventory.shields": increment(-1) });

                            await batch.commit();

                            setConqueredRoutes(prev => prev.map(r =>
                                r.id === selectedRoute.id ? { ...r, shieldUntil: shieldTimestamp } : r
                            ));

                            setSelectedRoute(null);
                            showAlert(t('common.success') as string, t('map.shieldMsg') as string, 'success');
                        } catch (err) {
                            console.error("Kalkan hatası:", err);
                            showAlert(t('common.error') as string, "İşlem başarısız oldu.", 'error');
                        }
                    }
                }
            ]
        );
    };

    const handleToggleTracking = async () => {
        if (isTracking) {
            setIsSaving(true);
            try {
                const { coords: finalCoords, duration } = await stopTracking();

                if (!finalCoords || finalCoords.length < 2) {
                    showAlert(t('common.error') as string, t('map.gpsError') as string, 'error');
                    await resetTracking();
                    setIsSaving(false);
                    return;
                }

                const distanceKm = calculateRouteDistance(finalCoords);

                if (distanceKm < MIN_DISTANCE_KM) {
                    showAlert(t('map.tooShort') as string, t('map.tooShortMsg', { min: MIN_DISTANCE_KM * 1000 }) as string, 'warning');
                    await resetTracking();
                    setIsSaving(false);
                    return;
                }

                const privacyFilteredCoords = applyPrivacyZone(finalCoords, userProfile?.privacyZone);

                if (privacyFilteredCoords.length < 2) {
                    showAlert(t('common.info') as string, "Rota tamamen gizli alanda kaldı, kaydedilmedi.", 'info');
                    await resetTracking();
                    setIsSaving(false);
                    return;
                }

                let simplifiedCoords = privacyFilteredCoords;
                try {
                    const lineString = turf.lineString(privacyFilteredCoords.map(c => [c.longitude, c.latitude]));
                    const simplified = turf.simplify(lineString, { tolerance: 0.0001, highQuality: false });
                    simplifiedCoords = simplified.geometry.coordinates.map((c: any) => ({ latitude: c[1], longitude: c[0] }));
                } catch (e) { }

                const bufferedCoords = createBufferedRoutePolygon(simplifiedCoords);
                const bufferedGeoPoints = bufferedCoords.map(c => new GeoPoint(c.latitude, c.longitude));

                const gaspedRoutes: string[] = [];
                const routesToCheck = conqueredRoutes.filter(r => r.ownerId !== userId);

                for (const route of routesToCheck) {
                    const now = Date.now();
                    const shieldTime = route.shieldUntil instanceof Timestamp ? route.shieldUntil.toMillis() : 0;
                    if (shieldTime > now) continue;

                    if (checkTurfIntersection(finalCoords, route.coords)) {
                        gaspedRoutes.push(route.id);
                    }
                }

                let baseScore = Math.floor(distanceKm * 10);
                let multiplierMessage = "";

                const activePotion = userProfile?.inventory?.activePotion;
                if (activePotion === 'x2_potion') {
                    baseScore *= 2;
                    multiplierMessage = "\n🧪 x2 İksir!";
                }

                const durationInSeconds = Math.floor(duration / 1000);
                let routeGeohash = "unknown";
                try {
                    routeGeohash = geohashForLocation([finalCoords[0].latitude, finalCoords[0].longitude]);
                } catch (e) {
                    routeGeohash = "unknown";
                }

                try {
                    const batch = writeBatch(db);
                    const newRouteRef = doc(collection(db, "routes"));

                    const newRouteData = {
                        userId: userId,
                        ownerId: userId,
                        ownerName: userProfile?.username || "İsimsiz Fatih",
                        coords: bufferedGeoPoints,
                        claimedAt: serverTimestamp(),
                        gaspScore: baseScore,
                        baseScore: baseScore,
                        distanceKm: parseFloat(distanceKm.toFixed(2)),
                        durationSeconds: durationInSeconds,
                        gaspedRoutes: gaspedRoutes,
                        geohash: routeGeohash
                    };
                    batch.set(newRouteRef, newRouteData);

                    const userRef = doc(db, "users", userId);
                    const userUpdateData: any = {
                        totalDistance: increment(parseFloat(distanceKm.toFixed(2))),
                        totalRoutes: increment(1),
                        totalScore: increment(baseScore),
                        weeklyScore: increment(baseScore)
                    };

                    if (activePotion === 'x2_potion') {
                        userUpdateData["inventory.activePotion"] = null;
                    }

                    if (userProfile?.dailyQuests) {
                        const runStats = {
                            distance: parseFloat(distanceKm.toFixed(2)),
                            time: Math.floor(duration / 1000 / 60),
                            score: baseScore,
                            conquests: 1 + gaspedRoutes.length
                        };

                        const updatedQuests = updateQuestProgress(userProfile.dailyQuests, runStats);

                        let questReward = 0;
                        const finalQuests = updatedQuests.map(q => {
                            if (!q.isClaimed && q.progress >= q.target) {
                                questReward += q.reward;
                                return { ...q, isClaimed: true };
                            }
                            return q;
                        });

                        if (questReward > 0) {
                            userUpdateData.totalScore = increment(baseScore + questReward);
                            userUpdateData.weeklyScore = increment(baseScore + questReward);
                            setTimeout(() => {
                                showAlert(t('common.success') as string, `Görev Tamamlandı! +${questReward} puan!`, 'success');
                            }, 1000);
                        }

                        userUpdateData.dailyQuests = finalQuests;
                    }

                    batch.update(userRef, userUpdateData);

                    if (gaspedRoutes.length > 0) {
                        for (const routeId of gaspedRoutes) {
                            const routeToGaspRef = doc(db, "routes", routeId);
                            const victimRoute = conqueredRoutes.find(r => r.id === routeId);
                            const victimId = victimRoute?.ownerId;

                            if (victimId && victimId !== userId) {
                                getDoc(doc(db, "users", victimId)).then(victimSnap => {
                                    if (victimSnap.exists()) {
                                        const victimToken = victimSnap.data().expoPushToken;
                                        if (victimToken) {
                                            sendPushNotification(
                                                victimToken,
                                                "⚔️ Gasp!",
                                                "Bölgen gitti!"
                                            );
                                        }
                                    }
                                }).catch(console.error);
                            }

                            batch.update(routeToGaspRef, {
                                ownerId: userId,
                                ownerName: userProfile?.username || "İsimsiz Fatih",
                                claimedAt: serverTimestamp(),
                                gaspScore: increment(5)
                            });

                            batch.update(userRef, {
                                totalScore: increment(5),
                                weeklyScore: increment(5)
                            });
                        }

                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        showAlert(t('map.conquered') as string, t('map.gaspMsg', { count: gaspedRoutes.length }) as string, 'success');
                    } else {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        showAlert(t('map.conquered') as string, t('map.conqueredMsg', { distance: distanceKm.toFixed(2), score: baseScore }) as string, 'success');
                    }

                    await batch.commit();

                    showAlert(
                        t('map.shareTitle') as string,
                        t('map.shareMsg') as string,
                        "success",
                        [
                            { text: t('map.noShare') as string, style: "cancel" },
                            { text: t('map.shareBtn') as string, onPress: handleShare, style: "default" }
                        ]
                    );

                    const newRoute: ConqueredRoute = {
                        id: newRouteRef.id,
                        ownerId: userId,
                        ownerName: userProfile?.username || "İsimsiz Fatih",
                        coords: bufferedCoords,
                        distanceKm: parseFloat(distanceKm.toFixed(2)),
                        gaspScore: baseScore,
                        claimedAt: Timestamp.now(),
                        durationSeconds: durationInSeconds,
                        geohash: routeGeohash
                    };

                    setConqueredRoutes(prev => {
                        const updatedPrev = prev.map(r =>
                            gaspedRoutes.includes(r.id)
                                ? {
                                    ...r,
                                    ownerId: userId,
                                    ownerName: userProfile?.username || "İsimsiz Fatih",
                                    gaspScore: (r.gaspScore || 0) + 5
                                }
                                : r
                        );
                        return [...updatedPrev, newRoute];
                    });

                } catch (firestoreError) {
                    const saved = await saveRouteOffline({
                        userId,
                        coords: bufferedCoords,
                        distanceKm: parseFloat(distanceKm.toFixed(2)),
                        durationSeconds: durationInSeconds,
                        timestamp: Date.now(),
                        gaspScore: baseScore,
                        baseScore: baseScore,
                        geohash: routeGeohash,
                        gaspedRoutes
                    });
                    if (saved) {
                        showAlert(t('common.warning') as string, "Çevrimdışı kaydedildi.", 'warning');
                    } else {
                        showAlert(t('common.error') as string, "Rota kaydedilemedi.", 'error');
                    }
                }

                await resetTracking();

            } catch (e) {
                console.error("Save error:", e);
                showAlert(t('common.error') as string, "Rota kaydedilemedi.", 'error');
            } finally {
                setIsSaving(false);
            }
        } else {
            if (!userId) {
                showAlert(
                    t('auth.guestLogin') as string,
                    t('auth.guestMessage') as string,
                    "info",
                    [
                        { text: t('common.cancel') as string, style: 'cancel' },
                        { text: t('auth.loginLink') as string, onPress: () => (navigation as any).navigate('AuthModal'), style: 'default' }
                    ]
                );
                return;
            }

            try {
                const fg = await Location.requestForegroundPermissionsAsync();
                if (fg.status !== 'granted') {
                    showAlert(t('map.locationPermTitle') as string, t('map.locationPermMsg') as string, 'error');
                    return;
                }

                const bg = await Location.getBackgroundPermissionsAsync();
                if (bg.status !== 'granted') {
                    setShowPermissionModal(true);
                } else {
                    await startRun();
                }
            } catch (error) {
                console.error("İzin kontrol hatası:", error);
                await startRun();
            }
        }
    };

    if (errorMsg) {
        return (<View style={styles.centerContainer}><Text style={styles.errorText}>{errorMsg}</Text></View>);
    }

    if (!currentLocation) {
        return (<View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /><Text style={[styles.text, { color: colors.text }]}>{t('common.loading') as string}</Text></View>);
    }

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                    latitudeDelta: 0.015,
                    longitudeDelta: 0.015,
                }}
                showsUserLocation={true}
                followsUserLocation={isTracking}
                loadingEnabled={true}
                onRegionChangeComplete={onRegionChangeComplete}
                onPress={() => setSelectedRoute(null)}
                toolbarEnabled={false}
                customMapStyle={isDark ? DARK_MAP_STYLE : []}
                provider={PROVIDER_GOOGLE}
            >
                <MapOverlay
                    routeCoordinates={routeCoordinates}
                    visibleRoutes={visibleRoutes}
                    userId={userId}
                    selectedRoute={selectedRoute}
                    handleRoutePress={setSelectedRoute}
                    getRouteMidpoint={getRouteMidpoint}
                    userActiveColor={activeColor}
                />
            </MapView>

            {isFetchingRoutes && (
                <View style={[styles.loadingOverlay, { backgroundColor: isDark ? 'rgba(30,30,30,0.8)' : 'rgba(255,255,255,0.8)' }]}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.loadingText, { color: colors.text }]}>{t('common.loading') as string}</Text>
                </View>
            )}

            {isBackgroundTracking && (
                <View style={styles.backgroundTrackingIndicator}>
                    <Text style={styles.backgroundTrackingText}>
                        {t('map.bgTracking') as string}
                    </Text>
                </View>
            )}

            <TouchableOpacity
                style={[styles.questButton, { backgroundColor: colors.primary }]}
                onPress={() => setQuestsVisible(true)}
            >
                <MaterialCommunityIcons name="clipboard-list-outline" size={28} color="white" />
                {dailyQuests.filter(q => !q.isClaimed && q.progress >= q.target).length > 0 && (
                    <View style={styles.badge} />
                )}
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={questsVisible}
                onRequestClose={() => setQuestsVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.primary }]}>{t('map.dailyQuests') as string}</Text>
                            <TouchableOpacity onPress={() => setQuestsVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                        <GenericScrollView style={{ marginTop: 10 }}>
                            {dailyQuests.map((quest) => {
                                const isCompleted = quest.progress >= quest.target;
                                const percent = Math.min(100, (quest.progress / quest.target) * 100);
                                return (
                                    <View key={quest.id} style={[
                                        styles.questItem,
                                        { backgroundColor: isDark ? '#333' : '#F5F5F5', borderColor: isDark ? '#444' : '#EEE' },
                                        isCompleted && { backgroundColor: isDark ? '#1B5E20' : '#E8F5E9', borderColor: colors.success }
                                    ]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.questDesc, { color: colors.text }]}>
                                                {quest.descriptionKey
                                                    ? (t(quest.descriptionKey, quest.descriptionParams) as string)
                                                    : ((quest as any).description || "Görev")}
                                            </Text>
                                            <View style={styles.progressBarBg}>
                                                <View style={[styles.progressBarFill, { width: `${percent}%`, backgroundColor: isCompleted ? colors.success : colors.secondary }]} />
                                            </View>
                                            <Text style={[styles.questProgressText, { color: colors.textSecondary }]}>
                                                {quest.progress.toFixed(1)} / {quest.target} • {quest.reward} {t('profile.points') as string}
                                            </Text>
                                        </View>
                                        {quest.isClaimed ? (
                                            <MaterialCommunityIcons name="check-circle" size={32} color={colors.success} />
                                        ) : isCompleted ? (
                                            <MaterialCommunityIcons name="gift-outline" size={32} color={colors.warning} />
                                        ) : (
                                            <MaterialCommunityIcons name="clock-outline" size={32} color={colors.textSecondary} />
                                        )}
                                    </View>
                                );
                            })}
                        </GenericScrollView>
                    </View>
                </View>
            </Modal>

            <TrackingControls
                isTracking={isTracking}
                isSaving={isSaving}
                runDuration={runDuration}
                distanceKm={calculateRouteDistance(routeCoordinates)}
                onToggleTracking={handleToggleTracking}
                formatDuration={formatDuration}
            />

            {selectedRoute && selectedRoute.ownerId === userId && !isTracking && (
                <View style={styles.shieldButtonContainer}>
                    <TouchableOpacity style={[styles.shieldButton, { backgroundColor: colors.primary }]} onPress={applyShield}>
                        <MaterialCommunityIcons name="shield-check" size={20} color="white" />
                        <Text style={styles.shieldButtonText}>{t('shop.items.shield') as string} ({userProfile?.inventory?.shields || 0})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.shieldButton, { backgroundColor: colors.secondary, marginTop: 10 }]} onPress={handleShare}>
                        <MaterialCommunityIcons name="share-variant" size={20} color="white" />
                        <Text style={styles.shieldButtonText}>{t('map.shareBtn') as string}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <LocationPermissionModal visible={showPermissionModal} onAccept={startRun} onDecline={() => setShowPermissionModal(false)} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    map: { flex: 1 },
    text: { marginTop: 20, fontSize: 16 },
    errorText: { fontSize: 16, color: '#D32F2F', textAlign: 'center' },
    loadingOverlay: {
        position: 'absolute', top: 60, right: 20,
        borderRadius: 20, padding: 5, paddingHorizontal: 10,
        flexDirection: 'row', alignItems: 'center', zIndex: 100, elevation: 3,
    },
    loadingText: { marginLeft: 5, fontSize: 12, fontWeight: 'bold' },
    backgroundTrackingIndicator: {
        position: 'absolute', top: 120, left: 20, backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#388E3C', zIndex: 90, elevation: 3,
    },
    backgroundTrackingText: { fontSize: 12, color: '#388E3C', fontWeight: 'bold' },
    shieldButtonContainer: { position: 'absolute', bottom: 180, alignSelf: 'center', zIndex: 20, alignItems: 'center' },
    shieldButton: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20,
        borderRadius: 25, ...SHADOWS.medium
    },
    shieldButtonText: { color: 'white', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },
    questButton: {
        position: 'absolute', top: 60, left: 20, padding: 10, borderRadius: 25,
        ...SHADOWS.medium, zIndex: 20
    },
    badge: {
        position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6,
        backgroundColor: 'red', borderWidth: 2, borderColor: 'white'
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { borderRadius: 20, padding: 20, maxHeight: '60%', ...SHADOWS.medium },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    questItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
    questDesc: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
    progressBarBg: { height: 6, borderRadius: 3, marginBottom: 4, overflow: 'hidden', backgroundColor: '#E0E0E0' },
    progressBarFill: { height: '100%', borderRadius: 3 },
    questProgressText: { fontSize: 11 }
});

export default MapScreen;