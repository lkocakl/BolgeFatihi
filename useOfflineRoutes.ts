import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Alert } from 'react-native';

const OFFLINE_ROUTES_KEY = 'offline_routes';

export interface OfflineRoute {
    id: string; // Temporary ID
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

    const saveRouteOffline = async (route: Omit<OfflineRoute, 'id'>) => {
        try {
            const newRoute = { ...route, id: Date.now().toString() };
            const updatedRoutes = [...offlineRoutes, newRoute];
            setOfflineRoutes(updatedRoutes);
            await AsyncStorage.setItem(OFFLINE_ROUTES_KEY, JSON.stringify(updatedRoutes));
            Alert.alert("Çevrimdışı Mod", "Rota cihazınıza kaydedildi. İnternet bağlantısı olduğunda senkronize edilecek.");
        } catch (e) {
            console.error("Failed to save route offline", e);
            Alert.alert("Hata", "Rota kaydedilemedi.");
        }
    };

    const syncRoutes = async () => {
        if (offlineRoutes.length === 0) return;
        if (isSyncing) return;

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
                routesToKeep.push(route); // Keep if failed
            }
        }

        setOfflineRoutes(routesToKeep);
        await AsyncStorage.setItem(OFFLINE_ROUTES_KEY, JSON.stringify(routesToKeep));
        setIsSyncing(false);

        if (syncedCount > 0) {
            Alert.alert("Senkronizasyon", `${syncedCount} rota başarıyla yüklendi!`);
        }
    };

    return {
        offlineRoutes,
        saveRouteOffline,
        syncRoutes,
        isSyncing
    };
};
