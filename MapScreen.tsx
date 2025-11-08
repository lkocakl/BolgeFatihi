// MapScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import MapView, { Polyline, Region } from 'react-native-maps'; 
import * as Location from 'expo-location'; 
import { calculateDistance, calculateRouteDistance, checkSimplifiedIntersection } from './utils';
import { 
    collection, addDoc, serverTimestamp, query, 
    getDocs, GeoPoint, updateDoc, doc, Timestamp, FieldValue
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig';

// YENİ: Navigasyon ve Auth Context
import { useNavigation } from '@react-navigation/native';
import { useAuth } from './AuthContext';
// SİLİNDİ: import { onAuthStateChanged } from 'firebase/auth';

// ... (Interface'ler ve formatDuration, isRouteInViewport fonksiyonları aynı, değişiklik yok) ...

interface ConqueredRoute {
    id: string;
    ownerId: string;
    coords: Coordinate[];
    distanceKm: number;
    gaspScore: number;
    claimedAt: Timestamp | FieldValue | undefined;
    durationSeconds?: number;
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


const MapScreen = () => {
    // 1. STATE TANIMLAMALARI
    
    // YENİ: Context'ten kullanıcıyı al
    const { user } = useAuth();
    // YENİ: Modal'ı açmak için navigasyonu al
    const navigation = useNavigation();
    
    // DEĞİŞİKLİK: userId state'ini 'user' objesinden türet
    const userId = user?.uid || ""; // Giriş yapmışsa uid'yi al, yoksa boş string

    // SİLİNDİ: const [userId, setUserId] = useState<string>("");
    
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

    const MIN_DISTANCE_KM = 0.1;
    const GASP_ESIGI_KM = 0.01;

    // SİLİNDİ: AUTHENTICATION (Artık AuthContext'te)
    // useEffect(() => { ... onAuthStateChanged ... }, []);

    // 2. SÜRE TAKİBİ (Değişiklik yok)
    useEffect(() => {
        // ... (kod aynı)
        if (isTracking) {
            intervalRef.current = setInterval(() => {
                setRunDuration(prevDuration => prevDuration + 1000);
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isTracking]);

    // 3. ROTA ÇEKME FONKSİYONU (Değişiklik yok)
    const fetchRoutes = async () => {
        // ... (kod aynı)
        try {
            const routesCollectionRef = collection(db, "routes");
            const q = query(routesCollectionRef);
            const querySnapshot = await getDocs(q);
            const fetchedRoutes: ConqueredRoute[] = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                if (!data.coords || !Array.isArray(data.coords)) return;
                const coordsArray: Coordinate[] = data.coords.map((coordItem: any) => {
                    if (coordItem.latitude !== undefined && coordItem.longitude !== undefined) {
                        return { latitude: Number(coordItem.latitude), longitude: Number(coordItem.longitude) };
                    }
                    if (coordItem.lat !== undefined && coordItem.lng !== undefined) {
                        return { latitude: Number(coordItem.lat), longitude: Number(coordItem.lng) };
                    }
                    return { latitude: 0, longitude: 0 };
                });
                const routeObj: ConqueredRoute = {
                    id: docSnap.id,
                    ownerId: data.ownerId ?? data.userId ?? "",
                    coords: coordsArray,
                    distanceKm: data.distanceKm ?? 0,
                    gaspScore: data.gaspScore ?? 0,
                    claimedAt: data.claimedAt,
                    durationSeconds: data.durationSeconds,
                };
                fetchedRoutes.push(routeObj);
            });
            setConqueredRoutes(fetchedRoutes);
            setVisibleRoutes(fetchedRoutes);
            console.log(`Firestore'dan ${fetchedRoutes.length} bölge çekildi.`);
        } catch (error) {
            console.error("Rotalar çekilirken hata oluştu: ", error);
            Alert.alert("Hata", "Fethedilmiş bölgeler yüklenemedi. İnternet bağlantınızı kontrol edin.");
        }
    };

    // 4. BAŞLANGIÇ KONUMU VE ROTA ÇEKME (Değişiklik yok)
    useEffect(() => {
        // ... (kod aynı)
        fetchRoutes();
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Harita ve Koşu Takibi için konum izni gerekli!');
                return;
            }
            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
            if (backgroundStatus !== 'granted') {
                Alert.alert(
                    "Sınırlı İzin", 
                    "Arka plan konum izni verilmedi. Uygulama arka planda çalışırken takip duracak.",
                    [{ text: "Anladım" }]
                );
            }
            let initialLocation = await Location.getCurrentPositionAsync({});
            setCurrentLocation({
                latitude: initialLocation.coords.latitude,
                longitude: initialLocation.coords.longitude,
            });
        })();
    }, []); 

    // PERFORMANCE OPTIMIZATION (Değişiklik yok)
    const onRegionChangeComplete = (region: Region) => {
        // ... (kod aynı)
        const filtered = conqueredRoutes.filter(route => 
            isRouteInViewport(route.coords, region)
        );
        setVisibleRoutes(filtered);
    };

    // 5. TAKİP DURUMUNU DEĞİŞTİRME FONKSİYONU (DEĞİŞİKLİK BURADA)
    const toggleTracking = async () => {
        console.log('--- Butona Basıldı! ---');
        if (isTracking) {
            // DURDURMA Durumu
            // ... (kod aynı)
            if (locationSubscription.current) {
                locationSubscription.current.remove();
                locationSubscription.current = null;
            }
            setIsTracking(false);
            const distanceKm = calculateRouteDistance(routeCoordinates);

            // Bu 'userId' kontrolü (const userId = user?.uid || "") sayesinde
            // 'isSaving' durumunda bile doğru çalışacaktır,
            // çünkü 'Durdur'a basıldığında 'userId' zaten dolu olmalı.
            if (!userId) {
                Alert.alert("Hata", "Kullanıcı kimliği bulunamadı. Lütfen tekrar giriş yapın.");
                setIsSaving(false); // Ekleme
                setRouteCoordinates([]); // Ekleme
                setRunDuration(0); // Ekleme
                return;
            }
            // ... (geri kalan 'Durdurma' kodları aynı)
            // ... (distanceKm < MIN_DISTANCE_KM kontrolü)
            // ...
            
            setIsSaving(true);
            try {
                // ... (Gasp kontrolü ve 'addDoc' kodları aynı)
                const gaspedRoutes: string[] = []; 
                for (const otherRoute of conqueredRoutes) {
                    if (otherRoute.ownerId === userId) continue;
                    const hasIntersection = checkSimplifiedIntersection(
                        routeCoordinates, otherRoute.coords, GASP_ESIGI_KM
                    );
                    if (hasIntersection) {
                        gaspedRoutes.push(otherRoute.id);
                        await updateDoc(doc(db, "routes", otherRoute.id), {
                            ownerId: userId,
                            gaspedAt: serverTimestamp(),
                            previousOwner: otherRoute.ownerId
                        });
                    }
                }
                const baseScore = Math.floor(distanceKm * 10);
                const geoPoints = routeCoordinates.map(
                    coord => new GeoPoint(coord.latitude, coord.longitude)
                );
                await addDoc(collection(db, "routes"), {
                    userId: userId, ownerId: userId, coords: geoPoints,
                    claimedAt: serverTimestamp(), gaspScore: baseScore,
                    baseScore: baseScore, distanceKm: parseFloat(distanceKm.toFixed(2)),
                    durationSeconds: Math.floor(runDuration / 1000),
                    gaspedRoutes: gaspedRoutes 
                });
                let message = `✅ Mesafe: ${distanceKm.toFixed(2)} km\n⏱️ Süre: ${formatDuration(runDuration)}\n🏆 Puan: ${baseScore}`;
                if (gaspedRoutes.length > 0) { 
                    message += `\n🎯 ${gaspedRoutes.length} bölge ele geçirildi!`;
                }
                Alert.alert("Koşu Tamamlandı!", message);
                await fetchRoutes();
                setRouteCoordinates([]);
                setRunDuration(0);

            } catch (e: any) { 
                console.error("Rota kaydederken hata oluştu: ", e);
                Alert.alert("Hata", "Veri kaydında hata oluştu. İnternet bağlantınızı kontrol edin.");
            } finally {
                setIsSaving(false);
            }

        } else {
            // BAŞLATMA Durumu (DEĞİŞİKLİK BURADA)
            
            // YENİ: Giriş kontrolü
            if (!user) { // 'userId' yerine 'user' objesini (context'ten gelen) kontrol et
                Alert.alert(
                  "Giriş Gerekli", 
                  "Koşuya başlamak için lütfen giriş yapın veya kaydolun."
                );
                // @ts-ignore
                navigation.navigate('AuthModal'); // Auth modalını aç
                return;
            }

            // (Geri kalan kodlar aynı)
            try { 
                setRunDuration(0);
                setRouteCoordinates(currentLocation ? [currentLocation] : []);
                setIsTracking(true); 
                setErrorMsg(null); 

                locationSubscription.current = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.BestForNavigation,
                        timeInterval: 3000, 
                        distanceInterval: 1, 
                    },
                    (locationUpdate) => {
                        const newCoord: Coordinate = {
                            latitude: locationUpdate.coords.latitude,
                            longitude: locationUpdate.coords.longitude,
                        };
                        setCurrentLocation(newCoord); 
                        setRouteCoordinates(prevCoords => [...prevCoords, newCoord]); 
                    }
                );
            } catch (error: any) {
                console.error("Koşu Başlatılırken Kritik Hata:", error);
                setErrorMsg("Takip başlatılamadı. Cihaz izinlerini kontrol edin.");
                setIsTracking(false); 
            }
        }
    };

    // 6. RENDER (GÖRÜNTÜLEME) (Değişiklik yok)
    if (errorMsg) {
        // ... (kod aynı)
        return (<View style={styles.centerContainer}><Text style={styles.errorText}>{errorMsg}</Text></View>);
    }
    if (!currentLocation) {
        // ... (kod aynı)
        return (<View style={styles.centerContainer}><ActivityIndicator size="large" color="#FF0000" /><Text style={styles.text}>Konum yükleniyor...</Text></View>);
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
                {routeCoordinates.length > 1 && (
                    <Polyline coordinates={routeCoordinates} strokeColor="#FF0000" strokeWidth={6} />
                )}
                {visibleRoutes.map((route) => (
                    <Polyline 
                        key={route.id}
                        coordinates={route.coords.map(coord => ({ latitude: coord.latitude, longitude: coord.longitude }))} 
                        strokeColor={route.ownerId === userId ? "#00AA00" : "#0066FF"}
                        strokeWidth={8} 
                        lineCap="round"
                        lineJoin="round"
                    />
                ))}
            </MapView>

            {isTracking && (
                <View style={styles.statContainer}>
                    <Text style={styles.statText}>📍 Mesafe: {calculateRouteDistance(routeCoordinates).toFixed(2)} KM</Text>
                    <Text style={styles.statText}>⏱️ Süre: {formatDuration(runDuration)}</Text>
                </View>
            )}
            
            <View style={styles.buttonContainer}>
                <TouchableOpacity 
                    style={[ styles.button, isTracking ? styles.stopButton : styles.startButton, isSaving && styles.disabledButton ]}
                    onPress={toggleTracking}
                    disabled={isSaving}
                >
                    {isSaving ? (<ActivityIndicator color="white" />) : (<Text style={styles.buttonText}>{isTracking ? 'DURDUR' : 'KOŞUYA BAŞLA'}</Text>)}
                </TouchableOpacity>
                {userId && (
                    <Text style={styles.coordText}>
                        👤 Kullanıcı: {userId.substring(0, 8)}...
                    </Text>
                )}
            </View>
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
    startButton: { backgroundColor: '#00cc00', },
    stopButton: { backgroundColor: '#ff3333', },
    disabledButton: { backgroundColor: '#888888', },
    buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold', },
    text: { marginTop: 20, fontSize: 16, color: '#333', },
    errorText: { fontSize: 16, color: '#ff3333', textAlign: 'center', },
    coordText: { marginTop: 10, backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', padding: 8, borderRadius: 5, fontSize: 12, }
});

export default MapScreen;
