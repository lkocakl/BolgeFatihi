// backgroundLocationTask.ts
// Arka planda konum takibi için task manager

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Task adı - Bu sabit olmalı
export const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Koordinatları saklamak için AsyncStorage key
const ROUTE_COORDS_KEY = '@background_route_coords';
const TRACKING_START_TIME_KEY = '@tracking_start_time';

// Background location task'ı tanımla
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as any;
    
    // Her yeni konum için
    const persistLocation = async (location: Location.LocationObject) => {
      const coord = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: Date.now(),
      };

      try {
        // Mevcut koordinatları al
        const existingCoordsJson = await AsyncStorage.getItem(ROUTE_COORDS_KEY);
        const existingCoords = existingCoordsJson 
          ? JSON.parse(existingCoordsJson) 
          : [];

        // Yeni koordinatı ekle
        const updatedCoords = [...existingCoords, coord];

        // AsyncStorage'a kaydet (son 1000 koordinatı tut)
        const coordsToSave = updatedCoords.slice(-1000);
        await AsyncStorage.setItem(ROUTE_COORDS_KEY, JSON.stringify(coordsToSave));

        console.log(`Background location saved: ${coord.latitude}, ${coord.longitude}`);
      } catch (error) {
        console.error('Error saving background location:', error);
      }
    };

    // Ensure promise chain resolves sequentially for predictable storage writes
    for (const location of locations as Location.LocationObject[]) {
      await persistLocation(location);
    }
  }
});

// Background tracking başlat
export const startBackgroundTracking = async (): Promise<boolean> => {
  try {
    // Background location izni kontrol et
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

    // Tracking başlangıç zamanını kaydet
    await AsyncStorage.setItem(TRACKING_START_TIME_KEY, Date.now().toString());

    // Background location tracking başlat
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 5000, // 5 saniyede bir
      distanceInterval: 10, // 10 metrede bir
      foregroundService: {
        notificationTitle: 'Bölge Fatihi',
        notificationBody: 'Koşu rotanız takip ediliyor...',
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



