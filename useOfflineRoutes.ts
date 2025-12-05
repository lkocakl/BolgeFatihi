import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import { db } from '../firebaseConfig';
// Alert.alert kaldırıldı

const OFFLINE_ROUTES_KEY = 'offline_routes';

export interface OfflineRoute {
    id: string;
    userId: string;
    coords: { latitude: number; longitude: number }[];
    distanceKm: number;
    durationSeconds: number;
    timestamp: number;
    gaspScore: number;
    baseScore: number;
    geohash: string;
    gaspedRoutes: string[];
}

export const useOfflineRoutes = () => {
    const [offlineRoutes, setOfflineRoutes] = useState<OfflineRoute[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        loadOfflineRoutes();
    }, []);

    const loadOfflineRoutes = async () => {
        try {
            const jsonValue = await AsyncStorage.getItem(OFFLINE_ROUTES_KEY);
            if (jsonValue != null) {
                setOfflineRoutes(JSON.parse(jsonValue));
            }
        } catch (e) {
            console.error("Failed to load offline routes", e);
        }
    };

    // [DÜZELTME] Fonksiyon artık Promise<boolean> dönüyor
    const saveRouteOffline = async (route: Omit<OfflineRoute, 'id'>): Promise<boolean> => {
        try {
            const newRoute = { ...route, id: Date.now().toString() };
            const updatedRoutes = [...offlineRoutes, newRoute];
            setOfflineRoutes(updatedRoutes);
            await AsyncStorage.setItem(OFFLINE_ROUTES_KEY, JSON.stringify(updatedRoutes));
            return true; // Başarılı
        } catch (e) {
            console.error("Failed to save route offline", e);
            return false; // Hata
        }
    };

    // [DÜZELTME] Eşitleme sonucu sayı dönüyor
    const syncRoutes = async (): Promise<number> => {
        if (offlineRoutes.length === 0) return 0;
        if (isSyncing) return 0;

        setIsSyncing(true);
        const routesToKeep: OfflineRoute[] = [];
        let syncedCount = 0;

        for (const route of offlineRoutes) {
            try {
                const geoPoints = route.coords.map(c => new GeoPoint(c.latitude, c.longitude));

                await addDoc(collection(db, "routes"), {
                    userId: route.userId,
                    ownerId: route.userId,
                    coords: geoPoints,
                    claimedAt: serverTimestamp(),
                    gaspScore: route.gaspScore,
                    baseScore: route.baseScore,
                    distanceKm: route.distanceKm,
                    durationSeconds: route.durationSeconds,
                    gaspedRoutes: route.gaspedRoutes,
                    geohash: route.geohash
                });
                syncedCount++;
            } catch (error) {
                console.error("Sync error for route", route.id, error);
                routesToKeep.push(route);
            }
        }

        setOfflineRoutes(routesToKeep);
        await AsyncStorage.setItem(OFFLINE_ROUTES_KEY, JSON.stringify(routesToKeep));
        setIsSyncing(false);

        return syncedCount;
    };

    return {
        offlineRoutes,
        saveRouteOffline,
        syncRoutes,
        isSyncing
    };
};