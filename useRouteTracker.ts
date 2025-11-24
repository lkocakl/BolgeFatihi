import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import { Coordinate } from '../utils';
import {
    startBackgroundTracking,
    stopBackgroundTracking,
    getBackgroundRouteCoords,
    clearBackgroundRouteCoords,
    getTrackingStartTime,
} from '../backgroundLocationTask';

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

    // Initialize location
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

            // Check for existing background session
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

    // Timer logic
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
        setIsTracking(true);

        // Start foreground tracking FIRST to ensure responsiveness
        try {
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
                    setCurrentLocation(newCoord);
                }
            );
        } catch (error) {
            console.error("Foreground tracking error:", error);
            setErrorMsg("Konum takibi başlatılamadı.");
            return false;
        }

        // Attempt to start background tracking (Non-fatal)
        try {
            const bgTrackingStarted = await startBackgroundTracking();
            if (bgTrackingStarted) {
                backgroundTrackingActive.current = true;
                setIsBackgroundTracking(true);
            } else {
                console.log("Background tracking failed to start, but foreground is active.");
            }
        } catch (bgError) {
            console.warn("Background tracking error (ignored):", bgError);
        }

        return true;
    };

    const stopTracking = async () => {
        // Stop foreground
        if (locationSubscription.current) {
            locationSubscription.current.remove();
            locationSubscription.current = null;
        }

        // Merge background coords if needed
        let finalCoords = [...routeCoordinates];
        const wasBackgroundTracking = backgroundTrackingActive.current;

        if (wasBackgroundTracking) {
            const bgCoords = await getBackgroundRouteCoords();
            const bgCoordsFormatted = bgCoords.map(c => ({
                latitude: c.latitude,
                longitude: c.longitude
            }));
            // Simple merge strategy: prefer background coords if they are more complete, 
            // but here we just append or replace. 
            // Since foreground updates `routeCoordinates` live, we might have duplicates if we just append.
            // For simplicity and robustness, let's trust the background coords as the source of truth for the whole run if it was active,
            // OR just use the live ones if the user was looking at the screen.
            // The original code merged them: `allCoords = [...routeCoordinates, ...bgCoordsFormatted];` 
            // which seems wrong (duplication). 
            // Let's assume background coords contain everything if the app was backgrounded.
            // If the app was foregrounded, `routeCoordinates` has everything.
            // A safe bet is to use `routeCoordinates` and append any *newer* points from background, but that's complex.
            // Let's stick to the original logic for now but maybe improve it slightly:
            // If background tracking was active, it captures ALL points? No, only when backgrounded?
            // `backgroundLocationTask.ts` says it saves locations.
            // Let's just return the current `routeCoordinates` for now, as `watchPositionAsync` should have caught them if foregrounded.
            // If backgrounded, `routeCoordinates` wouldn't update.
            // So we MUST fetch from background storage.

            if (bgCoordsFormatted.length > routeCoordinates.length) {
                finalCoords = bgCoordsFormatted;
            }

            await stopBackgroundTracking();
            backgroundTrackingActive.current = false;
            setIsBackgroundTracking(false);
        }

        setIsTracking(false);
        return { coords: finalCoords, duration: runDuration };
    };

    const resetTracking = async () => {
        setRouteCoordinates([]);
        setRunDuration(0);
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
        setRouteCoordinates, // Exposed for manual manipulation if needed
        setRunDuration
    };
};
