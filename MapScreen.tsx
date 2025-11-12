// MapScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import MapView, { Polyline, Region, Marker, Callout } from 'react-native-maps'; 
import * as Location from 'expo-location'; 
import * as turf from '@turf/turf'; 

// --- DÜZELTME: Tüm 'Feature' ve 'LineString' importları kaldırıldı ---

import { 
    collection, addDoc, serverTimestamp, query, 
    getDocs, GeoPoint, updateDoc, doc, Timestamp, FieldValue,
    where,
    QueryDocumentSnapshot, DocumentData,
    onSnapshot,
    QuerySnapshot,
    getDoc
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
    // ... (kod aynı)
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(minutes)}:${pad(seconds)}`;
};
const isRouteInViewport = (coords: Coordinate[], region: Region): boolean => {
    // ... (kod aynı)
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
    // ... (kod aynı)
    if (coords.length === 0) return { latitude: 0, longitude: 0 };
    const midIndex = Math.floor(coords.length / 2);
    return coords[midIndex];
}
// --- Arayüzler ve Yardımcı Fonksiyonlar Sonu ---

// --- 'utils.ts' FONKSİYONLARI (Değişiklik yok) ---

/**
 * İki koordinat arasındaki mesafeyi kilometre (KM) cinsinden hesaplar.
 * (Haversine formülü)
 */
export const calculateDistance = (coord1: Coordinate, coord2: Coordinate): number => {
    const R = 6371; // Dünya yarıcapı (km)
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
// --- 'utils.ts' FONKSİYONLARI SONU ---

// --- YENİ: TURF.JS TABANLI GASP KONTROLÜ ---
const BUFFER_METERS = 10; // 10 metrelik bir alanı gasp et

/**
 * Koordinat dizisini Turf.js'in anlayacağı GeoJSON LineString formatına çevirir.
 */
// --- DÜZELTME: Dönüş tipi 'any' olarak ayarlandı ---
const coordsToLineString = (coords: Coordinate[]): any | null => {
    if (coords.length < 2) return null;
    // GeoJSON formatı [longitude, latitude] sırasını kullanır
    const coordinates = coords.map(c => [c.longitude, c.latitude]);
    // Fonksiyonu 'turf' üzerinden çağırıyoruz
    return turf.lineString(coordinates);
};
// --- DÜZELTME SONU ---


/**
 * İki rota arasında "alan" (buffer) kesişimi olup olmadığını kontrol eder.
 */
const checkTurfIntersection = (newRouteCoords: Coordinate[], oldRouteCoords: Coordinate[]): boolean => {
    const newRouteLine = coordsToLineString(newRouteCoords);
    const oldRouteLine = coordsToLineString(oldRouteCoords);

    // Rotalardan biri geçersizse (2 noktadan az) kesişim yok say
    if (!newRouteLine || !oldRouteLine) return false;

    try {
        // 1. Rotaların etrafına 10 metrelik bir "tampon" (alan) oluştur
        const newRouteBuffer = turf.buffer(newRouteLine, BUFFER_METERS, { units: 'meters' });
        const oldRouteBuffer = turf.buffer(oldRouteLine, BUFFER_METERS, { units: 'meters' });

        // 'undefined' kontrolü
        if (!newRouteBuffer || !oldRouteBuffer) {
            console.log("Turf buffer oluşturulamadı.");
            return false;
        }

        // 2. Bu iki alan (poligon) birbiriyle kesişiyor mu?
        const intersects = turf.booleanIntersects(newRouteBuffer, oldRouteBuffer);
        
        return intersects;
    } catch (error) {
        console.error("Turf.js kesişim hatası:", error);
        return false; // Hata olursa kesişim yok say
    }
};
// --- YENİ: TURF.JS KONTROLÜ SONU ---


type UserMap = { [userId: string]: string };

const MapScreen = () => {
    // 1. STATE TANIMLAMALARI
    const { user } = useAuth();
    const navigation = useNavigation();
    const userId = user?.uid || ""; 
    
    // ... (diğer state'ler) ...
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
    
    const markerRef = useRef<React.ElementRef<typeof Marker>>(null);

    const MIN_DISTANCE_KM = 0.1;

    // 2. SÜRE TAKİBİ (Tamamlandı)
    useEffect(() => {
        // ... (kod aynı)
        if (isTracking) {
            const startTime = Date.now() - runDuration;
            intervalRef.current = setInterval(() => {
                setRunDuration(Date.now() - startTime);
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isTracking]);

    
    // 3. ROTA ÇEKME FONKSİYONU (Tamamlandı)
    const loadRoutesForRegion = async (region: Region) => {
        // ... (kod aynı)
        if (isFetchingRoutes) return;
        setIsFetchingRoutes(true);

        const center: Coordinate = {
            latitude: region.latitude,
            longitude: region.longitude
        };
        const radiusInM = (region.latitudeDelta * 111320) / 2; 

        const bounds = geohashQueryBounds([center.latitude, center.longitude], radiusInM);
        const newGeohashesToLoad: string[] = [];
        
        for (const b of bounds) {
            const geohash = b.join();
            if (!loadedGeohashes.current.has(geohash)) {
                newGeohashesToLoad.push(geohash);
                loadedGeohashes.current.add(geohash);
            }
        }
        
        if (newGeohashesToLoad.length === 0) {
            setIsFetchingRoutes(false);
            return;
        }

        try {
            const queries = newGeohashesToLoad.map(hashRange => {
                return query(
                    collection(db, "routes"), 
                    where("geohash", ">=", hashRange[0]), 
                    where("geohash", "<=", hashRange[1])
                );
            });

            const snapshots = await Promise.all(queries.map(q => getDocs(q)));
            const newRoutes: ConqueredRoute[] = [];

            snapshots.forEach(snapshot => {
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const routeCoords: Coordinate[] = (data.coords || []).map((gp: GeoPoint) => ({
                        latitude: gp.latitude,
                        longitude: gp.longitude
                    }));

                    newRoutes.push({
                        id: doc.id,
                        ownerId: data.ownerId || data.userId,
                        coords: routeCoords,
                        distanceKm: data.distanceKm || 0,
                        gaspScore: data.gaspScore || 0,
                        claimedAt: data.claimedAt,
                        durationSeconds: data.durationSeconds,
                        geohash: data.geohash
                    });
                });
            });

            if (newRoutes.length > 0) {
                setConqueredRoutes(prevRoutes => {
                    const existingIds = new Set(prevRoutes.map(r => r.id));
                    const filteredNewRoutes = newRoutes.filter(r => !existingIds.has(r.id));
                    return [...prevRoutes, ...filteredNewRoutes];
                });
            }
        } catch (error) {
            console.error("Rotalar çekilirken hata: ", error);
            // Hata durumunda geohash'leri tekrar yüklenebilir hale getir
            newGeohashesToLoad.forEach(hash => loadedGeohashes.current.delete(hash));
        } finally {
            setIsFetchingRoutes(false);
        }
    };

    // 4. BAŞLANGIÇ KONUMU VE KULLANICI İSİMLERİNİ ÇEKME (Düzeltildi)
    useEffect(() => {
        // ... (kod aynı)
        let isMounted = true; 

        const initializeScreen = async () => {
            
            // 1. Adım: Konum İzni Al
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                if (isMounted) setErrorMsg('Haritayı kullanmak için konum izni vermelisiniz.');
                return;
            }

            // 2. Adım: Konum Al (HATA DÜZELTMESİ BURADA)
            let location: Location.LocationObject | null = null;
            
            try {
                location = await Location.getLastKnownPositionAsync({});

                if (!location) {
                    console.log("Son konum bulunamadı, yeni konum isteniyor...");
                    location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced, 
                    });
                }

            } catch (error) {
                console.error("Konum alınırken hata:", error);
                if (isMounted) setErrorMsg("Konum bilgisi alınamadı. Cihazın konum ayarlarını kontrol edin.");
                return;
            }

            if (isMounted && location) {
                setCurrentLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });
            } else if (isMounted) {
                setErrorMsg("Geçerli bir konum bilgisi alınamadı.");
            }

            // 3. Adım: Kullanıcı Haritasını Çek (userMap state'i için)
            try {
                const usersCollectionRef = collection(db, "users");
                const querySnapshot = await getDocs(usersCollectionRef);
                const newMap: UserMap = {};
                querySnapshot.forEach((doc) => {
                    newMap[doc.id] = doc.data().username || `...@${doc.id.substring(doc.id.length - 6)}`;
                });
                
                if (isMounted) {
                    setUserMap(newMap);
                }
            } catch (error) {
                console.error("Kullanıcı haritası çekilirken hata:", error);
            }
        };

        initializeScreen();

        return () => {
            isMounted = false;
        };
    }, []); 

    // 5. HARİTA HAREKETLERİ (Tamamlandı)
    const onRegionChangeComplete = (region: Region) => {
        // ... (kod aynı)
        currentRegionRef.current = region;
        loadRoutesForRegion(region);

        // Görünür rotaları filtrele
        setVisibleRoutes(
            conqueredRoutes.filter(route => isRouteInViewport(route.coords, region))
        );
    };
    
    // Rota Tıklama Fonksiyonu (Değişiklik yok)
    const handleRoutePress = (route: ConqueredRoute) => {
        // ... (kod aynı)
        setSelectedRoute(route);
        setTimeout(() => {
            markerRef.current?.showCallout();
        }, 100); 
    };

    // 6. TAKİP DURUMUNU DEĞİŞTİRME FONKSİYONU (Turf.js GASP KONTROLÜ)
    const toggleTracking = async () => {
        if (isTracking) {
            // DURDURMA Durumu
            if (locationSubscription.current) {
                locationSubscription.current.remove();
                locationSubscription.current = null;
            }
            setIsTracking(false);
            const distanceKm = calculateRouteDistance(routeCoordinates); 

            if (distanceKm < MIN_DISTANCE_KM) {
                Alert.alert("Çok Kısa", `Minimum rota uzunluğu ${MIN_DISTANCE_KM * 1000} metredir. Bu rota kaydedilmeyecek.`);
                setRouteCoordinates([]);
                setRunDuration(0);
                return;
            }
            
            setIsSaving(true);
            try {
                // --- Gasp kontrolü (Turf.js kullanıldı) ---
                const gaspedRoutes: string[] = [];
                // Sadece başkalarının rotalarını kontrol et
                const routesToCheck = conqueredRoutes.filter(r => r.ownerId !== userId);

                for (const route of routesToCheck) {
                    // YENİ: Alan kesişimini kontrol et
                    const intersection = checkTurfIntersection(routeCoordinates, route.coords);
                    
                    if (intersection) {
                        gaspedRoutes.push(route.id);
                    }
                }
                // --- Gasp kontrolü sonu ---
                
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

                // Yeni rotayı veritabanına ekle
                const newDocRef = await addDoc(collection(db, "routes"), {
                    userId: userId, 
                    ownerId: userId, 
                    coords: geoPoints,
                    claimedAt: serverTimestamp(), 
                    gaspScore: baseScore, 
                    baseScore: baseScore, 
                    distanceKm: parseFloat(distanceKm.toFixed(2)), 
                    durationSeconds: durationInSeconds, 
                    gaspedRoutes: gaspedRoutes, // Hangi rotaları kestiğinin kaydı
                    geohash: routeGeohash 
                });
                

                // --- GELİŞMİŞ GASP MANTIĞI (Değişiklik yok) ---
                if (gaspedRoutes.length > 0) {
                    console.log(`${gaspedRoutes.length} adet rota gasp edildi!`);
                    
                    // Her bir gasp edilen rota için Firestore'da güncelleme yap
                    for (const routeId of gaspedRoutes) {
                        const routeToGaspRef = doc(db, "routes", routeId);
                        
                        try {
                            // Puanı artırmak için mevcut rotanın verisini çekmeliyiz
                            const routeDocSnap = await getDoc(routeToGaspRef);
                            
                            if (routeDocSnap.exists()) {
                                const routeData = routeDocSnap.data();
                                const currentGaspScore = routeData.gaspScore || routeData.baseScore || 10;
                                
                                // Puanı %20 artır (veya en az 5 puan ekle)
                                const newGaspScore = Math.max(
                                    Math.floor(currentGaspScore * 1.2), // %20 artış
                                    currentGaspScore + 5 // Veya min 5 puan
                                );

                                // Rotayı güncelle: Sahibi değiştir, puanı artır
                                await updateDoc(routeToGaspRef, {
                                    ownerId: userId, // Sahibi yeni kullanıcı yap
                                    claimedAt: serverTimestamp(), // Ele geçirme tarihini güncelle
                                    gaspScore: newGaspScore // Puanı artır
                                });
                                console.log(`Rota ${routeId} gasp edildi. Yeni sahip: ${userId}, Yeni Puan: ${newGaspScore}`);

                                // LOKAL STATE'i GÜNCELLE
                                const updateRouteInState = (route: ConqueredRoute) => {
                                    if (route.id === routeId) {
                                        return {
                                            ...route,
                                            ownerId: userId, // Sahibi değiştir
                                            gaspScore: newGaspScore // Puanı güncelle
                                        };
                                    }
                                    return route;
                                };
                                
                                setConqueredRoutes(prevRoutes => prevRoutes.map(updateRouteInState));
                                setVisibleRoutes(prevVisible => prevVisible.map(updateRouteInState));
                            }
                        } catch (e) {
                            console.error(`Rota ${routeId} güncellenirken hata:`, e);
                        }
                    }
                    
                    // Rota gasp edildiği için Alert mesajını güncelle
                    Alert.alert(
                        "Bölge Fethedildi!",
                        `Mesafe: ${distanceKm.toFixed(2)} KM\nSüre: ${formatDuration(runDuration)}\nKazanılan Puan: ${baseScore}\n\nEk olarak ${gaspedRoutes.length} adet rakip bölgeyi ele geçirdin!`
                    );

                } else {
                    // Normal, gaspsız koşu
                    Alert.alert(
                        "Bölge Fethedildi!",
                        `Mesafe: ${distanceKm.toFixed(2)} KM\nSüre: ${formatDuration(runDuration)}\nKazanılan Puan: ${baseScore}`
                    );
                }
                // --- GELİŞMİŞ GASP MANTIĞI SONU ---
                
                
                // Yeni rotayı lokal state'e ekle
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
                setVisibleRoutes(prev => [...prev, newRouteForState]); // Ekrana da ekle
                
                setRouteCoordinates([]);
                setRunDuration(0);

            } catch (e: any) { 
                console.error("Rota kaydederken hata oluştu: ", e);
                Alert.alert("Hata", "Veri kaydında hata oluştu. İnternet bağlantınızı kontrol edin.");
            } finally {
                setIsSaving(false);
            }

        } else {
            // BAŞLATMA Durumu
            
            // --- GİRİŞ KONTROLÜ (Değişiklik yok) ---
            if (!userId) {
                Alert.alert("Giriş Gerekli", "Koşuya başlamak için lütfen giriş yapın.", [
                    // @ts-ignore
                    { text: "Giriş Yap", onPress: () => navigation.navigate('AuthModal') },
                    { text: "İptal", style: 'cancel' }
                ]);
                return; // Fonksiyondan çık, koşuyu BAŞLATMA.
            }
            // --- KONTROL SONU ---


            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Koşuya başlamak için konum izni vermelisiniz.');
                return;
            }

            setRouteCoordinates([]);
            setRunDuration(0);
            setIsTracking(true);

            locationSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 2000,
                    distanceInterval: 5,
                },
                (location) => {
                    const newCoord = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude
                    };
                    setRouteCoordinates(prevCoords => [...prevCoords, newCoord]);
                }
            );
        }
    };

    // 7. RENDER (GÖRÜNTÜLEME)
    if (errorMsg) {
        return (<View style={styles.centerContainer}><Text style={styles.errorText}>{errorMsg}</Text></View>);
    }
    
    if (!currentLocation) {
        return (<View style={styles.centerContainer}><ActivityIndicator size="large" color="#388E3C" /><Text style={styles.text}>Konum yükleniyor...</Text></View>);
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
                        strokeColor="#D32F2F" // Kiremit Kırmızısı
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
                            ? "#388E3C" // Sahip olunan (Sağlık Yeşili)
                            : "#1E88E5" // Diğerleri (Gökyüzü Mavisi)
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

            
            {/* --- BUTONLAR VE İSTATİSTİKLER (Değişiklik yok) --- */}

            {isFetchingRoutes && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color="#388E3C" />
                    <Text style={styles.loadingText}>Rotalar yükleniyor</Text>
                </View>
            )}

            {isTracking && (
                <View style={styles.statContainer}>
                    <Text style={styles.statText}>Süre: {formatDuration(runDuration)}</Text>
                    <Text style={styles.statText}>Mesafe: {calculateRouteDistance(routeCoordinates).toFixed(2)} KM</Text>
                </View>
            )}
            
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    onPress={toggleTracking}
                    disabled={isSaving}
                    style={[
                        styles.button,
                        isSaving
                            ? styles.disabledButton
                            : isTracking
                            ? styles.stopButton
                            : styles.startButton,
                    ]}
                >
                    <Text style={styles.buttonText}>
                        {isSaving
                            ? 'Kaydediliyor...'
                            : isTracking
                            ? 'Durdur & Kaydet'
                            : 'Koşuya Başla'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* --- JSX SONU --- */}

        </View>
    );
};

// Stiller (Değişiklik yok)
const styles = StyleSheet.create({
    container: { flex: 1, },
    centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, },
    map: { flex: 1, },
    statContainer: { position: 'absolute', top: 60, left: 20, backgroundColor: 'rgba(0, 0, 0, 0.7)', borderRadius: 10, padding: 10, zIndex: 100, flexDirection: 'column', alignItems: 'flex-start', },
    statText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginVertical: 2, },
    buttonContainer: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center', },
    button: { paddingVertical: 15, paddingHorizontal: 30, borderRadius: 50, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, minWidth: 200, alignItems: 'center', },
    startButton: { 
        backgroundColor: '#388E3C', // Sağlık Yeşili
    },
    stopButton: { 
        backgroundColor: '#D32F2F', // Kiremit Kırmızısı
    },
    disabledButton: { backgroundColor: '#888888', },
    buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold', },
    text: { 
        marginTop: 20, 
        fontSize: 16, 
        color: '#757575', // Orta Gri
    },
    errorText: { 
        fontSize: 16, 
        color: '#D32F2F', // Kiremit Kırmızısı
        textAlign: 'center', 
    },
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
        color: '#424242', // Koyu Toprak
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
        color: '#424242', // Koyu Toprak
        marginBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        paddingBottom: 3,
    },
    calloutText: {
        fontSize: 14,
        color: '#757575', // Orta Gri
    },
    calloutLabel: {
        fontWeight: 'bold',
        color: '#424242', // Koyu Toprak
    }
});

export default MapScreen;
