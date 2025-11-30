import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Alert, TouchableOpacity, Modal, ScrollView as GenericScrollView } from 'react-native';
import MapView, { Region } from 'react-native-maps';
import * as turf from '@turf/turf';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // İkon için

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
import { calculateRouteDistance, Coordinate, sendPushNotification } from './utils';
import { useRouteTracker } from './hooks/useRouteTracker';
import { useRouteFetcher, ConqueredRoute } from './hooks/useRouteFetcher';
import { useUserMap } from './hooks/useUserMap';
import { useOfflineRoutes } from './hooks/useOfflineRoutes';
import MapOverlay from './components/MapOverlay';
import TrackingControls from './components/TrackingControls';
import CustomAlert from './components/CustomAlert';
import { COLORS, SHADOWS } from './constants/theme';
import { generateDailyQuests, updateQuestProgress } from './QuestSystem';

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
    const { user, userProfile } = useAuth();
    const navigation = useNavigation();
    const userId = user?.uid || "";
    
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [activeColor, setActiveColor] = useState('#1E88E5');

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

    const [visibleRoutes, setVisibleRoutes] = useState<ConqueredRoute[]>([]);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [selectedRoute, setSelectedRoute] = useState<ConqueredRoute | null>(null);

    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ title: string, message: string, type: 'success' | 'error' | 'warning' }>({
        title: '',
        message: '',
        type: 'warning'
    });

    // Görev Sistemi State'leri
    const [questsVisible, setQuestsVisible] = useState(false);
    const [dailyQuests, setDailyQuests] = useState<Quest[]>([]);

    const currentRegionRef = useRef<Region | null>(null);
    const MIN_DISTANCE_KM = 0.1;

    useEffect(() => {
        syncRoutes();
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

    // GÜNLÜK GÖREV KONTROLÜ
    useEffect(() => {
        if (!user || !userProfile) return;

        const checkDailyQuests = async () => {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const lastDate = userProfile.lastQuestDate;

            // Eğer bugün görevler henüz oluşturulmadıysa veya tarih farklıysa
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
        setVisibleRoutes(
            conqueredRoutes.filter(route => isRouteInViewport(route.coords, region))
        );
    }, [conqueredRoutes, loadRoutesForRegion]);

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

    const startRun = async () => {
        try {
            setShowPermissionModal(false);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const started = await startTracking();
            if (!started) {
                console.log("Tracking could not start");
            }
        } catch (error) {
            console.error("Start tracking error:", error);
            showAlert("Hata", "Takip başlatılamadı: " + (error as any).message, 'error');
        }
    };

    const applyShield = async () => {
        if (!selectedRoute || !user) return;

        const shieldCount = userProfile?.inventory?.shields || 0;

        if (shieldCount <= 0) {
             Alert.alert("Yetersiz Stok", "Hiç kalkanın yok. Marketten satın almalısın.");
             return;
        }

        const now = Date.now();
        const currentShield = selectedRoute.shieldUntil instanceof Timestamp 
            ? selectedRoute.shieldUntil.toMillis() 
            : 0;
        
        if (currentShield > now) {
             Alert.alert("Zaten Korumada", "Bu rota zaten kalkan koruması altında.");
             return;
        }

        Alert.alert(
            "Kalkanı Kullan",
            "1 adet kalkan harcayarak bu bölgeyi 24 saat korumaya almak istiyor musun?",
            [
                { text: "Vazgeç", style: "cancel" },
                { 
                    text: "Koru 🛡️", 
                    onPress: async () => {
                        try {
                            const batch = writeBatch(db);
                            const routeRef = doc(db, "routes", selectedRoute.id);
                            const userRef = doc(db, "users", user.uid);

                            // 24 Saat sonrası
                            const shieldUntilDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
                            const shieldTimestamp = Timestamp.fromDate(shieldUntilDate);

                            // Rota güncelle
                            batch.update(routeRef, { shieldUntil: shieldTimestamp });
                            // Stoktan düş
                            batch.update(userRef, { "inventory.shields": increment(-1) });

                            await batch.commit();

                            // Yerel state'i güncelle (Anlık görünmesi için)
                            setConqueredRoutes(prev => prev.map(r => 
                                r.id === selectedRoute.id ? {...r, shieldUntil: shieldTimestamp} : r
                            ));
                            
                            // Modalı kapat ve seçimi kaldır
                            setSelectedRoute(null); 
                            
                            Alert.alert("Bölge Korunuyor!", "Bu bölge 24 saat boyunca kimse tarafından gasp edilemez. 🛡️");
                        } catch (err) {
                            console.error("Kalkan hatası:", err);
                            Alert.alert("Hata", "İşlem başarısız oldu.");
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
                    const now = Date.now();
                    const shieldTime = route.shieldUntil instanceof Timestamp ? route.shieldUntil.toMillis() : 0;

                    if (shieldTime > now) {
                        console.log(`Rota ${route.id} korumalı, pas geçiliyor.`);
                        continue; 
                    }

                    if (checkTurfIntersection(finalCoords, route.coords)) {
                        gaspedRoutes.push(route.id);
                    }
                }

                let baseScore = Math.floor(distanceKm * 10);
                let multiplierMessage = "";

                const activePotion = userProfile?.inventory?.activePotion;
                if (activePotion === 'x2_potion') {
                    baseScore *= 2;
                    multiplierMessage = "\n🧪 x2 İksir Kullanıldı!";
                }

                const durationInSeconds = Math.floor(duration / 1000);
                const geoPoints = finalCoords.map(c => new GeoPoint(c.latitude, c.longitude));

                let routeGeohash = "none";
                if (finalCoords.length > 0) {
                    const startPoint = finalCoords[0];
                    routeGeohash = geohashForLocation([startPoint.latitude, startPoint.longitude]);
                }

                try {
                    const batch = writeBatch(db);

                    const newRouteRef = doc(collection(db, "routes"));
                    const newRouteData = {
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
                    };
                    batch.set(newRouteRef, newRouteData);

                    const userRef = doc(db, "users", userId);
                    const userUpdateData: any = {
                        totalDistance: increment(parseFloat(distanceKm.toFixed(2))),
                        totalRoutes: increment(1),
                        totalScore: increment(baseScore),
                        weeklyScore: increment(baseScore) // [YENİ] Haftalık puana ekle
                    };

                    if (activePotion === 'x2_potion') {
                        userUpdateData["inventory.activePotion"] = null;
                    }

                    // --- GÜNLÜK GÖREV GÜNCELLEMESİ ---
                    if (userProfile?.dailyQuests) {
                        const runStats = {
                            distance: parseFloat(distanceKm.toFixed(2)),
                            time: Math.floor(duration / 1000 / 60), // Dakika
                            score: baseScore,
                            conquests: 1 + gaspedRoutes.length // Kendi rotan + gasp ettiklerin
                        };

                        const updatedQuests = updateQuestProgress(userProfile.dailyQuests, runStats);
                        
                        // Tamamlanan var mı kontrol et ve ödül ver
                        let questReward = 0;
                        const finalQuests = updatedQuests.map(q => {
                            if (!q.isClaimed && q.progress >= q.target) {
                                questReward += q.reward;
                                return { ...q, isClaimed: true }; // Ödülü alındı işaretle
                            }
                            return q;
                        });

                        if (questReward > 0) {
                            userUpdateData.totalScore = increment(baseScore + questReward);
                            userUpdateData.weeklyScore = increment(baseScore + questReward);
                            showAlert("Görev Tamamlandı!", `Tebrikler! Ekstra ${questReward} puan kazandın! 🎯`, 'success');
                        }

                        userUpdateData.dailyQuests = finalQuests;
                    }
                    // ---------------------------------

                    batch.update(userRef, userUpdateData);

                    if (gaspedRoutes.length > 0) {
                        for (const routeId of gaspedRoutes) {
                            const routeToGaspRef = doc(db, "routes", routeId);
                            const victimRoute = conqueredRoutes.find(r => r.id === routeId);
                            const victimId = victimRoute?.ownerId;

                            if (victimId && victimId !== userId) {
                                const victimUserRef = doc(db, "users", victimId);
                                getDoc(victimUserRef).then(victimSnap => {
                                    if (victimSnap.exists()) {
                                        const victimToken = victimSnap.data().expoPushToken;
                                        if (victimToken) {
                                            sendPushNotification(
                                                victimToken,
                                                "⚔️ Bölgen Gasp Edildi!",
                                                "Biri koşu rotanı ele geçirdi! Geri almak için hemen koşuya çık."
                                            );
                                        }
                                    }
                                }).catch(console.error);
                            }

                            batch.update(routeToGaspRef, {
                                ownerId: userId,
                                claimedAt: serverTimestamp(),
                                gaspScore: increment(5)
                            });

                            batch.update(userRef, {
                                totalScore: increment(5),
                                weeklyScore: increment(5) // [YENİ] Gasp puanını haftalığa da ekle
                            });
                        }
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        showAlert("Bölge Fethedildi!", `Ek olarak ${gaspedRoutes.length} adet rakip bölgeyi ele geçirdin!`, 'success');
                    } else {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        showAlert("Bölge Fethedildi!", `Mesafe: ${distanceKm.toFixed(2)} KM\nPuan: ${baseScore}${multiplierMessage}`, 'success');
                    }

                    await batch.commit();

                    const newRoute: ConqueredRoute = {
                        id: newRouteRef.id,
                        ownerId: userId,
                        coords: finalCoords,
                        distanceKm: parseFloat(distanceKm.toFixed(2)),
                        gaspScore: baseScore,
                        claimedAt: Timestamp.now(),
                        durationSeconds: durationInSeconds,
                        geohash: routeGeohash
                    };

                    setConqueredRoutes(prev => {
                        const updatedPrev = prev.map(r =>
                            gaspedRoutes.includes(r.id)
                                ? { ...r, ownerId: userId, gaspScore: (r.gaspScore || 0) + 5 }
                                : r
                        );
                        return [...updatedPrev, newRoute];
                    });

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
            if (!userId) {
                Alert.alert("Giriş Gerekli", "Lütfen giriş yapın.", [
                    { text: "Giriş", onPress: () => (navigation as any).navigate('AuthModal') },
                    { text: "İptal", style: 'cancel' }
                ]);
                return;
            }

            try {
                const { status } = await Location.getBackgroundPermissionsAsync();
                if (status !== 'granted') {
                    setShowPermissionModal(true);
                } else {
                    await startRun();
                }
            } catch (error) {
                console.error("İzin kontrol hatası:", error);
                setShowPermissionModal(true);
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
                    userActiveColor={activeColor}
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

            {/* Görevler Butonu (Sol Üst) */}
            <TouchableOpacity 
                style={styles.questButton} 
                onPress={() => setQuestsVisible(true)}
            >
                <MaterialCommunityIcons name="clipboard-list-outline" size={28} color="white" />
                {/* Tamamlanmamış görev sayısı kadar rozet (opsiyonel) */}
                {dailyQuests.filter(q => !q.isClaimed && q.progress >= q.target).length > 0 && (
                    <View style={styles.badge} />
                )}
            </TouchableOpacity>

            {/* Görevler Modalı */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={questsVisible}
                onRequestClose={() => setQuestsVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Günlük Görevler</Text>
                            <TouchableOpacity onPress={() => setQuestsVisible(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>
                        <GenericScrollView style={{marginTop: 10}}>
                            {dailyQuests.map((quest) => {
                                const isCompleted = quest.progress >= quest.target;
                                const percent = Math.min(100, (quest.progress / quest.target) * 100);
                                
                                return (
                                    <View key={quest.id} style={[styles.questItem, isCompleted && styles.questItemCompleted]}>
                                        <View style={{flex: 1}}>
                                            <Text style={styles.questDesc}>{quest.description}</Text>
                                            <View style={styles.progressBarBg}>
                                                <View style={[styles.progressBarFill, { width: `${percent}%`, backgroundColor: isCompleted ? '#4CAF50' : '#2196F3' }]} />
                                            </View>
                                            <Text style={styles.questProgressText}>
                                                {quest.progress.toFixed(1)} / {quest.target} • {quest.reward} Puan
                                            </Text>
                                        </View>
                                        {quest.isClaimed ? (
                                            <MaterialCommunityIcons name="check-circle" size={32} color="#4CAF50" />
                                        ) : isCompleted ? (
                                            <MaterialCommunityIcons name="gift-outline" size={32} color="#FF9800" />
                                        ) : (
                                            <MaterialCommunityIcons name="clock-outline" size={32} color="#BDBDBD" />
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
            
            {/* [YENİ] Kalkan Kullan Butonu (Sadece kendi rotanı seçince ve takipte değilken görünür) */}
            {selectedRoute && selectedRoute.ownerId === userId && !isTracking && (
                <View style={styles.shieldButtonContainer}>
                    <TouchableOpacity style={styles.shieldButton} onPress={applyShield}>
                        <MaterialCommunityIcons name="shield-check" size={20} color="white" />
                        <Text style={styles.shieldButtonText}>
                            Kalkanla Koru ({userProfile?.inventory?.shields || 0})
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            <LocationPermissionModal 
                visible={showPermissionModal}
                onAccept={startRun}
                onDecline={() => setShowPermissionModal(false)}
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
    // [YENİ] Kalkan butonu stili
    shieldButtonContainer: {
        position: 'absolute',
        bottom: 180, // Kontrollerin üstünde
        alignSelf: 'center',
        zIndex: 20,
    },
    shieldButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary, // Yeşil tema
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 25,
        ...SHADOWS.medium
    },
    shieldButtonText: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 14
    },
    // [YENİ] Görev Butonu Stilleri
    questButton: {
        position: 'absolute',
        top: 60,
        left: 20,
        backgroundColor: COLORS.primary,
        padding: 10,
        borderRadius: 25,
        ...SHADOWS.medium,
        zIndex: 20
    },
    badge: {
        position: 'absolute',
        top: 0, right: 0,
        width: 12, height: 12,
        borderRadius: 6,
        backgroundColor: 'red',
        borderWidth: 2,
        borderColor: 'white'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        maxHeight: '60%',
        ...SHADOWS.medium
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primaryDark
    },
    questItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#EEE'
    },
    questItemCompleted: {
        backgroundColor: '#E8F5E9',
        borderColor: '#C8E6C9'
    },
    questDesc: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 6
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        marginBottom: 4,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3
    },
    questProgressText: {
        fontSize: 11,
        color: COLORS.textSecondary
    }
});

export default MapScreen;