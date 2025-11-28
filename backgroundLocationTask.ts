// backgroundLocationTask.ts
// Arka planda konum takibi için task manager

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateRouteDistance } from './utils'; // Mesafe hesaplama fonksiyonu

// Task adı - Bu sabit olmalı
export const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Koordinatları saklamak için AsyncStorage key
const ROUTE_COORDS_KEY = '@background_route_coords';
const TRACKING_START_TIME_KEY = '@tracking_start_time';

// Süreyi formatlamak için yardımcı fonksiyon
const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
};

// Background location task'ı tanımla
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as any;

    try {
        // 1. Başlangıç zamanını ve mevcut süreyi hesapla
        const startTimeStr = await AsyncStorage.getItem(TRACKING_START_TIME_KEY);
        const startTime = startTimeStr ? parseInt(startTimeStr, 10) : Date.now();
        const durationMs = Date.now() - startTime;

        // 2. Mevcut koordinatları al
        const existingCoordsJson = await AsyncStorage.getItem(ROUTE_COORDS_KEY);
        let allCoords = existingCoordsJson ? JSON.parse(existingCoordsJson) : [];

        // 3. Yeni gelen konumları listeye ekle
        const newPoints = (locations as Location.LocationObject[]).map(loc => ({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            // timestamp: loc.timestamp 
        }));

        allCoords = [...allCoords, ...newPoints];

        // 4. Veriyi AsyncStorage'a kaydet (Son 10.000 nokta ile sınırladık)
        const coordsToSave = allCoords.slice(-10000); 
        await AsyncStorage.setItem(ROUTE_COORDS_KEY, JSON.stringify(coordsToSave));

        // 5. Mesafeyi ve Süreyi Hesapla
        const distanceKm = calculateRouteDistance(allCoords);
        const distanceStr = distanceKm.toFixed(2); 
        const durationStr = formatDuration(durationMs);

        // 6. Bildirimi GÜNCELLE (HATA DÜZELTME BURASI) 🔥
        // Android 12+ kısıtlaması nedeniyle arka planda servis güncellemesi hata verebilir.
        // Bu hatayı yakalayıp yutuyoruz ki tracking durmasın.
        try {
            await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: 5000, // 5 saniye
                distanceInterval: 5, // 5 metre
                foregroundService: {
                    notificationTitle: 'Koşu Devam Ediyor 🏃',
                    notificationBody: `${distanceStr} km • ${durationStr}`,
                    notificationColor: '#388E3C',
                },
                pausesUpdatesAutomatically: false,
                showsBackgroundLocationIndicator: true,
            });
        } catch (notifyError) {
            // Arka planda bildirim güncellenemedi, sorun değil.
            // Konum takibi çalışmaya devam eder.
            // console.log("Bildirim güncellemesi kısıtlamaya takıldı (Normal)");
        }

        console.log(`BG Update: ${distanceStr}km - ${durationStr}`);

    } catch (err) {
        console.error("Background task error:", err);
    }
  }
});

// Background tracking başlat
export const startBackgroundTracking = async (): Promise<boolean> => {
  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      console.error('Foreground location permission not granted');
      return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      console.error('Background location permission not granted');
      return false;
    }

    await AsyncStorage.setItem(TRACKING_START_TIME_KEY, Date.now().toString());

    // İlk başlatma (Foreground'da olduğu için burada try-catch gerekmez)
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 5000,
      distanceInterval: 5,
      foregroundService: {
        notificationTitle: 'Koşu Başlatılıyor...',
        notificationBody: 'Hazırlanıyor...',
        notificationColor: '#388E3C',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });

    console.log('Background location tracking started');
    return true;
  } catch (error) {
    console.error('Error starting background tracking:', error);
    return false;
  }
};

// Background tracking durdur
export const stopBackgroundTracking = async (): Promise<void> => {
  try {
    const isTaskDefined = await TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
    if (isTaskDefined) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('Background location tracking stopped');
    }
  } catch (error) {
    console.error('Error stopping background tracking:', error);
  }
};

// Background'dan kaydedilen koordinatları al
export const getBackgroundRouteCoords = async (): Promise<Array<{latitude: number; longitude: number; timestamp: number}>> => {
  try {
    const coordsJson = await AsyncStorage.getItem(ROUTE_COORDS_KEY);
    if (coordsJson) {
      return JSON.parse(coordsJson);
    }
    return [];
  } catch (error) {
    console.error('Error getting background route coords:', error);
    return [];
  }
};

// Background koordinatlarını temizle
export const clearBackgroundRouteCoords = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ROUTE_COORDS_KEY);
    await AsyncStorage.removeItem(TRACKING_START_TIME_KEY);
  } catch (error) {
    console.error('Error clearing background route coords:', error);
  }
};

// Tracking başlangıç zamanını al
export const getTrackingStartTime = async (): Promise<number | null> => {
  try {
    const startTimeStr = await AsyncStorage.getItem(TRACKING_START_TIME_KEY);
    return startTimeStr ? parseInt(startTimeStr, 10) : null;
  } catch (error) {
    console.error('Error getting tracking start time:', error);
    return null;
  }
};