import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, addDoc, serverTimestamp, GeoPoint } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useNetworkStatus } from './useNetworkStatus'; // Yeni hook'u import et

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
    const { isOnline } = useNetworkStatus();

    // Uygulama açıldığında yükle
    useEffect(() => {
        loadOfflineRoutes();
    }, []);

    // İnternet geldiğinde ve offline rota varsa otomatik senkronize et
    useEffect(() => {
        if (isOnline && offlineRoutes.length > 0) {
            console.log("İnternet bağlantısı algılandı, rotalar senkronize ediliyor...");
            syncRoutes();
        }
    }, [isOnline, offlineRoutes.length]);

    const loadOfflineRoutes = async () => {
        try {
            const jsonValue = await AsyncStorage.getItem(OFFLINE_ROUTES_KEY);
            if (jsonValue != null) {
                setOfflineRoutes(JSON.parse(jsonValue));
            }
        } catch (e) {
            console.error("Offline rotalar yüklenemedi", e);
        }
    };

    const saveRouteOffline = async (route: Omit<OfflineRoute, 'id'>): Promise<boolean> => {
        try {
            const newRoute = { ...route, id: Date.now().toString() };
            // Mevcut listeye ekle
            const updatedRoutes = [...offlineRoutes, newRoute];

            // State'i güncelle
            setOfflineRoutes(updatedRoutes);

            // Storage'a kaydet
            await AsyncStorage.setItem(OFFLINE_ROUTES_KEY, JSON.stringify(updatedRoutes));
            return true;
        } catch (e) {
            console.error("Rota offline kaydedilemedi", e);
            return false;
        }
    };

    const syncRoutes = async (): Promise<number> => {
        // Eğer zaten senkronizasyon yapılıyorsa veya rota yoksa veya internet yoksa çık
        if (offlineRoutes.length === 0 || isSyncing || !isOnline) return 0;

        setIsSyncing(true);
        const routesToKeep: OfflineRoute[] = [];
        let syncedCount = 0;

        // Mevcut rotaların kopyasını al (işlem sırasında state değişirse karışmasın)
        const routesToSync = [...offlineRoutes];

        for (const route of routesToSync) {
            try {
                const geoPoints = route.coords.map(c => new GeoPoint(c.latitude, c.longitude));

                await addDoc(collection(db, "routes"), {
                    userId: route.userId,
                    ownerId: route.userId,
                    // Eğer offline kaydedildiyse isim o anki profilden alınmalıydı ama
                    // burada tekrar güncel profili çekmek yerine basitçe ID'yi kullanabiliriz
                    // veya offline verisine username de ekleyebiliriz. Şimdilik ID yeterli.
                    ownerName: "Fatih (Offline)",
                    coords: geoPoints,
                    claimedAt: serverTimestamp(), // Sunucu zamanı
                    gaspScore: route.gaspScore,
                    baseScore: route.baseScore,
                    distanceKm: route.distanceKm,
                    durationSeconds: route.durationSeconds,
                    gaspedRoutes: route.gaspedRoutes,
                    geohash: route.geohash,
                    isSynced: true // Senkronize edildiğini işaretleyebiliriz
                });
                syncedCount++;
            } catch (error) {
                console.error("Rota senkronizasyon hatası:", route.id, error);
                // Hata veren rotayı sakla, sonra tekrar deneriz
                routesToKeep.push(route);
            }
        }

        // Başarılı olanları listeden çıkar
        setOfflineRoutes(routesToKeep);
        await AsyncStorage.setItem(OFFLINE_ROUTES_KEY, JSON.stringify(routesToKeep));
        setIsSyncing(false);

        return syncedCount;
    };

    return {
        offlineRoutes,
        saveRouteOffline,
        syncRoutes,
        isSyncing,
        isOnline // UI'da göstermek için dışarı açıyoruz
    };
};