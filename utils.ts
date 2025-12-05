import * as Sharing from 'expo-sharing';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;

const toRad = (value: number): number => {
  return value * Math.PI / 180;
};

// İki nokta arası mesafeyi hesaplar (Haversine Formülü)
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
  return EARTH_RADIUS_KM * c;
};

// Rota üzerindeki toplam mesafeyi hesaplar
export const calculateRouteDistance = (coordinates: { latitude: number; longitude: number; }[]): number => {
  if (!coordinates || coordinates.length < 2) {
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

// Yerel saat dilimine göre tarih döndürür (YYYY-MM-DD)
export const getLocalISOString = (): string => {
  const date = new Date();
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() - offsetMs);
  return localDate.toISOString().split('T')[0];
};

// [GÜNCELLENDİ] Lig Bilgisi (Çeviri Anahtarlarıyla)
export const getLeagueInfo = (score: number) => {
  if (score >= 10000) return { name: 'league.diamond', color: '#B9F2FF', icon: 'diamond-stone', min: 10000 };
  if (score >= 5000) return { name: 'league.gold', color: '#FFD700', icon: 'crown', min: 5000 };
  if (score >= 1000) return { name: 'league.silver', color: '#C0C0C0', icon: 'shield-outline', min: 1000 };
  return { name: 'league.bronze', color: '#CD7F32', icon: 'shield-half-full', min: 0 };
};

// [YENİ] Görüntü Paylaşma Fonksiyonu
export const shareImage = async (uri: string) => {
  if (!(await Sharing.isAvailableAsync())) {
    alert("Paylaşım bu cihazda desteklenmiyor.");
    return;
  }
  await Sharing.shareAsync(uri);
};

// Push Bildirim Gönderme
export const sendPushNotification = async (expoPushToken: string, title: string, body: string, data: any = {}) => {
  if (!expoPushToken) return;

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error("Bildirim gönderme hatası:", error);
  }
};