// BolgeFatihi/utils.ts

export interface Coordinate {
  latitude: number;
  longitude: number;
}
// Haversine formülü: İki koordinat arasındaki mesafeyi (km cinsinden) hesaplar.
const EARTH_RADIUS_KM = 6371;

// Dereceyi radyana çeviren yardımcı fonksiyon
const toRad = (value: number): number => {
  return value * Math.PI / 180;
};

/**
 * İki GPS koordinatı arasındaki mesafeyi Haversine formülü ile hesaplar.
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

// --- [YENİ] PUSH BİLDİRİM GÖNDERME YARDIMCISI ---
/**
 * Belirtilen Expo Push Token'a bildirim gönderir.
 * @param expoPushToken Alıcının push token'ı
 * @param title Bildirim başlığı
 * @param body Bildirim içeriği
 * @param data (Opsiyonel) Bildirimle gidecek ekstra veri
 */
export const sendPushNotification = async (expoPushToken: string, title: string, body: string, data: any = {}) => {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log("Bildirim gönderildi:", result);
  } catch (error) {
    console.error("Bildirim gönderme hatası:", error);
  }
};