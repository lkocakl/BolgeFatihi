import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech'; // [YENİ] Sesli asistan
import { Coordinate, calculateRouteDistance } from '../utils'; // [YENİ] Mesafe hesabı gerekli
import {
    startBackgroundTracking,
    stopBackgroundTracking,
    getBackgroundRouteCoords,
    clearBackgroundRouteCoords,
    getTrackingStartTime,
} from '../backgroundLocationTask';

const MAX_VALID_SPEED_MS = 6;
const MIN_VALID_SPEED_MS = 0.5;

export const useRouteTracker = () => {
    const [isTracking, setIsTracking] = useState<boolean>(false);
    const [routeCoordinates, setRouteCoordinates] = useState<Coordinate[]>([]);
    const [runDuration, setRunDuration] = useState<number>(0);
    const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isBackgroundTracking, setIsBackgroundTracking] = useState<boolean>(false);

    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const backgroundTrackingActive = useRef<boolean>(false);

    // [YENİ] Son konuşulan km bilgisini tutar (Örn: 1. km söylendi, tekrar söyleme)
    const lastSpokenKm = useRef<number>(0);

    useEffect(() => {
        let isMounted = true;

        const initializeLocation = async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                if (isMounted) setErrorMsg('Haritayı kullanmak için konum izni vermelisiniz.');
                return;
            }

            try {
                let location = await Location.getLastKnownPositionAsync({});
                if (!location) {
                    location = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                }
                if (isMounted && location) {
                    setCurrentLocation({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude
                    });
                }
            } catch (error) {
                console.error("Konum alınırken hata:", error);
                if (isMounted) setErrorMsg("Konum bilgisi alınamadı.");
            }

            try {
                const bgCoords = await getBackgroundRouteCoords();
                const bgStartTime = await getTrackingStartTime();

                if (bgCoords.length > 0 && bgStartTime) {
                    const coords = bgCoords.map(c => ({
                        latitude: c.latitude,
                        longitude: c.longitude
                    }));

                    if (isMounted) {
                        setRouteCoordinates(coords);
                        setRunDuration(Date.now() - bgStartTime);
                        setIsTracking(true);
                        backgroundTrackingActive.current = true;
                        setIsBackgroundTracking(true);
                    }
                }
            } catch (error) {
                console.error("Background koordinatları yüklenirken hata:", error);
            }
        };

        initializeLocation();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
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

    const startTracking = async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            setErrorMsg('Koşuya başlamak için konum izni vermelisiniz.');
            return false;
        }

        await clearBackgroundRouteCoords();
        setRouteCoordinates([]);
        setRunDuration(0);
        lastSpokenKm.current = 0; // [YENİ] Km sayacını sıfırla
        setIsTracking(true);

        // [YENİ] Başlangıç konuşması
        Speech.speak("Koşu başladı. İyi şanslar!", { language: 'tr-TR' });

        try {
            locationSubscription.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 2000,
                    distanceInterval: 5,
                },
                (location) => {
                    let currentSpeed = location.coords.speed;
                    if (currentSpeed === null || currentSpeed < 0) currentSpeed = 0;

                    if (currentSpeed > MAX_VALID_SPEED_MS && routeCoordinates.length > 0) {
                        return;
                    }

                    if (currentSpeed < MIN_VALID_SPEED_MS && location.coords.accuracy && location.coords.accuracy > 20 && routeCoordinates.length > 0) {
                        setCurrentLocation({
                            latitude: location.coords.latitude,
                            longitude: location.coords.longitude
                        });
                        return;
                    }

                    const newCoord = {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude
                    };

                    // [YENİ] Sesli Geri Bildirim Mantığı
                    setRouteCoordinates(prevCoords => {
                        const updatedCoords = [...prevCoords, newCoord];

                        // Mesafeyi hesapla
                        const totalDistKm = calculateRouteDistance(updatedCoords);
                        const currentKmFloor = Math.floor(totalDistKm);

                        // Eğer yeni bir km tamamlandıysa (örn: 0.9'dan 1.0'a geçildi)
                        if (currentKmFloor > 0 && currentKmFloor > lastSpokenKm.current) {
                            lastSpokenKm.current = currentKmFloor;
                            Speech.speak(`Tebrikler, ${currentKmFloor}. kilometreyi tamamladın!`, {
                                language: 'tr-TR',
                                rate: 0.9
                            });
                        }

                        return updatedCoords;
                    });

                    setCurrentLocation(newCoord);
                }
            );
        } catch (error) {
            console.error("Foreground tracking error:", error);
            setErrorMsg("Konum takibi başlatılamadı.");
            return false;
        }

        try {
            const bgTrackingStarted = await startBackgroundTracking();
            if (bgTrackingStarted) {
                backgroundTrackingActive.current = true;
                setIsBackgroundTracking(true);
            }
        } catch (bgError) {
            console.warn("Background tracking error (ignored):", bgError);
        }

        return true;
    };

    const stopTracking = async () => {
        if (locationSubscription.current) {
            locationSubscription.current.remove();
            locationSubscription.current = null;
        }

        let finalCoords = [...routeCoordinates];
        const wasBackgroundTracking = backgroundTrackingActive.current;

        if (wasBackgroundTracking) {
            const bgCoords = await getBackgroundRouteCoords();
            const bgCoordsFormatted = bgCoords.map(c => ({
                latitude: c.latitude,
                longitude: c.longitude
            }));

            if (bgCoordsFormatted.length > routeCoordinates.length) {
                finalCoords = bgCoordsFormatted;
            }

            await stopBackgroundTracking();
            backgroundTrackingActive.current = false;
            setIsBackgroundTracking(false);
        }

        setIsTracking(false);

        // [YENİ] Bitiş konuşması
        const finalDist = calculateRouteDistance(finalCoords).toFixed(2);
        Speech.speak(`Koşu tamamlandı. Toplam mesafe ${finalDist} kilometre.`, { language: 'tr-TR' });

        return { coords: finalCoords, duration: runDuration };
    };

    const resetTracking = async () => {
        setRouteCoordinates([]);
        setRunDuration(0);
        lastSpokenKm.current = 0; // [YENİ]
        await clearBackgroundRouteCoords();
    };

    return {
        isTracking,
        routeCoordinates,
        runDuration,
        currentLocation,
        errorMsg,
        isBackgroundTracking,
        startTracking,
        stopTracking,
        resetTracking,
        setRouteCoordinates,
        setRunDuration
    };
};