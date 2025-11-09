// MapScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import MapView, { Polyline, Region, Marker, Callout } from 'react-native-maps'; 
import * as Location from 'expo-location'; 

// --- DÜZELTME: './utils' importu SİLİNDİ ---
// import { calculateDistance, calculateRouteDistance, checkSimplifiedIntersection } from './utils';
// --- DÜZELTME SONU ---

import { 
    collection, addDoc, serverTimestamp, query, 
    getDocs, GeoPoint, updateDoc, doc, Timestamp, FieldValue,
    where,
    QueryDocumentSnapshot, DocumentData,
    onSnapshot,
    QuerySnapshot
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from './AuthContext';

import { geohashForLocation, geohashQueryBounds } from 'geofire-common';

// --- Arayüzler ve Yardımcı Fonksiyonlar (Değişiklik yok) ---
interface ConqueredRoute {
    id: string;
    ownerId: string;
    coords: Coordinate[];
    distanceKm: number;
    gaspScore: number;
    claimedAt: Timestamp | FieldValue | undefined;
    durationSeconds?: number;
    geohash?: string;
}
interface Coordinate {
    latitude: number;
    longitude: number;
}
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
// --- Arayüzler ve Yardımcı Fonksiyonlar Sonu ---

// --- DÜZELTME: 'utils.ts' FONKSİYONLARI BU DOSYAYA TAŞINDI ---

/**
 * İki koordinat arasındaki mesafeyi kilometre (KM) cinsinden hesaplar.
 * (Haversine formülü)
 */
export const calculateDistance = (coord1: Coordinate, coord2: Coordinate): number => {
    const R = 6371; // Dünya yarıçapı (km)
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a = 
        0.5 - Math.cos(dLat)/2 + 
        Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) * (1 - Math.cos(dLon)) / 2;
    const distance = R * 2 * Math.asin(Math.sqrt(a));
    return distance; // Bu fonksiyon bir 'number' döndürüyor
}

/**
 * Bir koordinat dizisinin (rota) toplam mesafesini kilometre (KM) cinsinden hesaplar.
 */
export const calculateRouteDistance = (coords: Coordinate[]): number => {
    let totalDistance = 0;
    if (coords.length < 2) {
        return 0; // Bu fonksiyon bir 'number' döndürüyor
    }
    for (let i = 1; i < coords.length; i++) {
        totalDistance += calculateDistance(coords[i - 1], coords[i]);
    }
    return totalDistance; // Bu fonksiyon bir 'number' döndürüyor
}

/**
 * İki rota arasında "basit" bir kesişim olup olmadığını kontrol eder.
 */
export const checkSimplifiedIntersection = (newRoute: Coordinate[], oldRoute: Coordinate[], thresholdKm: number): boolean => {
    for (const newPoint of newRoute) {
        for (const oldPoint of oldRoute) {
            if (calculateDistance(newPoint, oldPoint) < thresholdKm) {
                return true; // Bu fonksiyon bir 'boolean' döndürüyor
            }
        }
    }
    return false; // Bu fonksiyon bir 'boolean' döndürüyor
}
// --- 'utils.ts' FONKSİYONLARI SONU ---


type UserMap = { [userId: string]: string };

const MapScreen = () => {
    // 1. STATE TANIMLAMALARI
    const { user } = useAuth();
    const navigation = useNavigation();
    const userId = user?.uid || ""; 
    
    // ... (diğer state'ler aynı) ...
    const [conqueredRoutes, setConqueredRoutes] = useState<ConqueredRoute[]>([]);
    const [visibleRoutes, setVisibleRoutes] = useState<ConqueredRoute[]>([]);
    const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
    const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
    const [isTracking, setIsTracking] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [runDuration, setRunDuration] = useState<number>(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const loadedGeohashes = useRef<Set<string>>(new Set());
    const currentRegionRef = useRef<Region | null>(null);
    const [isFetchingRoutes, setIsFetchingRoutes] = useState(false);
    
    const [userMap, setUserMap] = useState<UserMap>({});
    const [selectedRoute, setSelectedRoute] = useState<ConqueredRoute | null>(null);
    
    // DÜZELTİLMİŞ 'Marker' referansı
    const markerRef = useRef<React.ElementRef<typeof Marker>>(null);


    const MIN_DISTANCE_KM = 0.1;
    const GASP_ESIGI_KM = 0.01;

    // 2. SÜRE TAKİBİ (Değişiklik yok)
    useEffect(() => {
        // ... (kod aynı)
    }, [isTracking]);

    
    // 3. ROTA ÇEKME FONKSİYONU (Değişiklik yok)
    const loadRoutesForRegion = async (region: Region) => {
        // ... (kod aynı)
    };

    // 4. BAŞLANGIÇ KONUMU VE KULLANICI İSİMLERİNİ ÇEKME (Değişiklik yok)
    useEffect(() => {
        // ... (kod aynı)
    }, []); 

    // 5. HARİTA HAREKETLERİ (Değişiklik yok)
    const onRegionChangeComplete = (region: Region) => {
        // ... (kod aynı)
    };
    
    // Rota Tıklama Fonksiyonu (Değişiklik yok)
    const handleRoutePress = (route: ConqueredRoute) => {
        setSelectedRoute(route);
        setTimeout(() => {
            markerRef.current?.showCallout();
        }, 100); 
    };

    // 6. TAKİP DURUMUNU DEĞİŞTİRME FONKSİYONU (Değişiklik yok)
    const toggleTracking = async () => {
        if (isTracking) {
            // DURDURMA Durumu
            // ...
            if (locationSubscription.current) {
                locationSubscription.current.remove();
                locationSubscription.current = null;
            }
            setIsTracking(false);
            const distanceKm = calculateRouteDistance(routeCoordinates); 

            if (!userId) {
                // ... (hata)
                return;
            }
            if (distanceKm < MIN_DISTANCE_KM) {
                // ... (hata)
                return;
            }
            
            setIsSaving(true);
            try {
                // ... (Gasp kontrolü aynı) ...
                const gaspedRoutes: string[] = [];
                // ... (döngü) ...
                
                const baseScore = Math.floor(distanceKm * 10);
                const durationInSeconds = Math.floor(runDuration / 1000); 
                const geoPoints = routeCoordinates.map(
                    coord => new GeoPoint(coord.latitude, coord.longitude)
                );
                
                let routeGeohash = "none";
                if(routeCoordinates.length > 0) {
                    const startPoint = routeCoordinates[0];
                    routeGeohash = geohashForLocation([startPoint.latitude, startPoint.longitude]);
                }

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
                
                // ... (Alert mesajı aynı) ...
                
                const newRouteForState: ConqueredRoute = {
                    id: newDocRef.id,
                    ownerId: userId,
                    coords: routeCoordinates, 
                    distanceKm: parseFloat(distanceKm.toFixed(2)),
                    gaspScore: baseScore,
                    claimedAt: new Timestamp(Date.now() / 1000, 0), 
                    durationSeconds: durationInSeconds,
                    geohash: routeGeohash
                };
                
                setConqueredRoutes(prevRoutes => [...prevRoutes, newRouteForState]);
                
                setRouteCoordinates([]);
                setRunDuration(0);

            } catch (e: any) { 
                console.error("Rota kaydederken hata oluştu: ", e);
                Alert.alert("Hata", "Veri kaydında hata oluştu. İnternet bağlantınızı kontrol edin.");
            } finally {
                setIsSaving(false);
            }

        } else {
            // BAŞLATMA Durumu (Değişiklik yok)
            // ... (kod aynı) ...
        }
    };

    // 7. RENDER (GÖRÜNTÜLEME)
    if (errorMsg) {
        // ... (kod aynı)
    }
    
    if (!currentLocation) {
        return (<View style={styles.centerContainer}><ActivityIndicator size="large" color="#FF5722" /><Text style={styles.text}>Konum yükleniyor...</Text></View>);
    }
    
    const initialRegion = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.0922, 
        longitudeDelta: 0.0421, 
    };

    return (
        <View style={styles.container}>
            <MapView 
                style={styles.map} 
                initialRegion={initialRegion}
                showsUserLocation={true} 
                followsUserLocation={isTracking} 
                loadingEnabled={true}
                onRegionChangeComplete={onRegionChangeComplete}
            >
                {/* Koşu Sırasındaki Rota Çizgisi */}
                {routeCoordinates.length > 1 && (
                    <Polyline 
                        coordinates={routeCoordinates} 
                        strokeColor="#FF5722"
                        strokeWidth={6} 
                    />
                )}
                
                {/* GÖRÜNÜR ROTALAR */}
                {visibleRoutes.map((route) => (
                    <Polyline 
                        key={route.id}
                        coordinates={route.coords.map(coord => ({ latitude: coord.latitude, longitude: coord.longitude }))} 
                        strokeColor={
                            route.ownerId === userId 
                            ? "#4CAF50" // Sahip olunan
                            : "#2196F3" // Diğerleri
                        }
                        strokeWidth={8} 
                        lineCap="round"
                        lineJoin="round"
                        tappable={true}
                        onPress={() => handleRoutePress(route)}
                    />
                ))}
                
                {/* GİZLİ MARKER (Bilgi Balonu için) */}
                {selectedRoute && (
                    <Marker
                        ref={markerRef}
                        coordinate={getRouteMidpoint(selectedRoute.coords)}
                        opacity={0}
                        anchor={{ x: 0.5, y: 0.5 }} 
                    >
                        <Callout tooltip={true} style={styles.calloutContainer}>
                            <View style={styles.calloutContent}>
                                <Text style={styles.calloutTitle}>Bölge Bilgisi</Text>
                                <Text style={styles.calloutText}>
                                    <Text style={styles.calloutLabel}>Sahip: </Text>
                                    {userMap[selectedRoute.ownerId] || `...@${selectedRoute.ownerId.substring(selectedRoute.ownerId.length - 6)}`}
                                </Text>
                                <Text style={styles.calloutText}>
                                    <Text style={styles.calloutLabel}>Puan: </Text>
                                    {selectedRoute.gaspScore} Puan
                                </Text>
                                <Text style={styles.calloutText}>
                                    <Text style={styles.calloutLabel}>Mesafe: </Text>
                                    {selectedRoute.distanceKm} KM
                                </Text>
                            </View>
                        </Callout>
                    </Marker>
                )}
                
            </MapView>

            {/* ... (Diğer JSX bileşenleri - Değişiklik yok) ... */}
            
            {isFetchingRoutes && (
                <View style={styles.loadingOverlay}>
                    {/* ... (kod aynı) ... */}
                </View>
            )}

            {isTracking && (
                <View style={styles.statContainer}>
                    {/* ... (kod aynı) ... */}
                </View>
            )}
            
            <View style={styles.buttonContainer}>
                {/* ... (kod aynı) ... */}
            </View>
        </View>
    );
};

// Stiller (Değişiklik yok)
const styles = StyleSheet.create({
    // ... (tüm stiller aynı) ...
    container: { flex: 1, },
    centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, },
    map: { flex: 1, },
    statContainer: { position: 'absolute', top: 60, left: 20, backgroundColor: 'rgba(0, 0, 0, 0.7)', borderRadius: 10, padding: 10, zIndex: 100, flexDirection: 'column', alignItems: 'flex-start', },
    statText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginVertical: 2, },
    buttonContainer: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center', },
    button: { paddingVertical: 15, paddingHorizontal: 30, borderRadius: 50, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, minWidth: 200, alignItems: 'center', },
    startButton: { backgroundColor: '#4CAF50', },
    stopButton: { backgroundColor: '#F44336', },
    disabledButton: { backgroundColor: '#888888', },
    buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold', },
    text: { marginTop: 20, fontSize: 16, color: '#666', },
    errorText: { fontSize: 16, color: '#F44336', textAlign: 'center', },
    coordText: { marginTop: 10, backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', padding: 8, borderRadius: 5, fontSize: 12, },
    loadingOverlay: {
        position: 'absolute',
        top: 60,
        right: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 20,
        paddingVertical: 5,
        paddingHorizontal: 10,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    loadingText: {
        marginLeft: 5,
        color: '#333',
        fontSize: 12,
        fontWeight: 'bold',
    },
    calloutContainer: {
        width: 200,
    },
    calloutContent: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    calloutTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 3,
    },
    calloutText: {
        fontSize: 14,
        color: '#555',
    },
    calloutLabel: {
        fontWeight: 'bold',
        color: '#000',
    }
});

export default MapScreen;
