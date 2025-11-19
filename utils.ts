// BolgeFatihi/utils.ts

export interface Coordinate {
  latitude: number;
  longitude: number;
}
// Haversine formülü: İki koordinat arasındaki mesafeyi (km cinsinden) hesaplar.
// Dünya'nın ortalama yarıçapı: 6371 km
const EARTH_RADIUS_KM = 6371;

// Dereceyi radyana çeviren yardımcı fonksiyon
const toRad = (value: number): number => {
  return value * Math.PI / 180;
};

/**
 * İki GPS koordinatı arasındaki mesafeyi Haversine formülü ile hesaplar.
 * @param lat1 Birinci noktanın enlemi (latitude)
 * @param lon1 Birinci noktanın boylamı (longitude)
 * @param lat2 İkinci noktanın enlemi (latitude)
 * @param lon2 İkinci noktanın boylamı (longitude)
 * @returns İki nokta arasındaki mesafe (kilometre cinsinden).
 */
export const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c; 
  return distance; // Km cinsinden
};

/**
 * Bir rota üzerindeki toplam mesafeyi hesaplar.
 * @param coordinates LocationCoordinates dizisi
 * @returns Rotanın toplam uzunluğu (kilometre cinsinden).
 */
export const calculateRouteDistance = (coordinates: { latitude: number; longitude: number; }[]): number => {
  if (coordinates.length < 2) {
    return 0;
  }

  let totalDistance = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = coordinates[i];
    const p2 = coordinates[i + 1];

    totalDistance += calculateDistance(
      p1.latitude,
      p1.longitude,
      p2.latitude,
      p2.longitude
    );
  }

  return totalDistance;
};

// --- DÜZELTME ---
// 'createRouteBuffer' ve 'checkSimplifiedIntersection' fonksiyonları kaldırıldı.
// Bu fonksiyonlar artık kullanılmıyordu, MapScreen.tsx doğrudan Turf.js kullanıyor.
// --- DÜZELTME SONU ---