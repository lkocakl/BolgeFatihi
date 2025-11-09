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
// BolgeFatihi/utils.ts (Mevcut içeriğin sonuna ekleyin)
// ... (calculateRouteDistance fonksiyonundan sonra)

// Bu fonksiyonlar, Turf.js'in yapacağı işi basitleştirilmiş GeoJSON formatıyla taklit eder.
// Normalde burada profesyonel bir GeoJSON ve Turf.js kütüphanesi entegrasyonu olurdu.
// React Native'de bu kadar karmaşık kütüphane eklemek yerine, temel mantığı uygulayacağız.

/**
 * Koşu rotasının etrafında, fethedilen bölgeyi temsil eden basit bir alan (Polyline Buffer) oluşturur.
 * Gerçekte Turf.js'in buffer fonksiyonu kullanılır. Biz burada Polyline'ı döndürüyoruz.
 * İleride Poligon görselleştirmesi için bu alanın sınırları kullanılacaktır.
 * @param coordinates Koşu rotası koordinatları
 * @param bufferKm Rotanın her iki yanındaki tampon genişliği (km)
 * @returns Rota koordinatları (şimdilik)
 */
export const createRouteBuffer = (coordinates: Coordinate[], bufferKm: number): Coordinate[] => {
    // BURASI ÇOK KRİTİK BİR YERDİR. 
    // Turf.js kullanarak bir "Polyline Buffer" oluşturmamız gerekirdi, 
    // bu da koşu hattının sağ ve sol tarafına 5-10 metre genişliğinde bir poligon çizerdi.
    // Şimdilik, sadece rotanın kendisini döndürüyoruz.
    return coordinates; 
    
    // Not: Gerçek bir uygulamada, bu kod, rotanın etrafında bir çokgen oluşturur.
};

/**
 * İki Poligon (Rotanın Tampon Bölgeleri) arasındaki çakışmayı kontrol eden basitleştirilmiş fonksiyon.
 * Gerçekte Turf.js'in intersect fonksiyonu kullanılır.
 * Bizim mevcut basit gasp mantığımızı burada tutarız: İki rota birbirine çok yakın mı?
 * @param newRoute Yeni kaydedilen rota
 * @param existingRoute Rakip rota
 * @param gaspEşigiKm Gasp eşiği (km)
 * @returns Çakışma varsa true, yoksa false.
 */
export const checkSimplifiedIntersection = (newRoute: Coordinate[], existingRoute: Coordinate[], gaspEşigiKm: number): boolean => {
    
    // Basitçe: Yeni rotadaki her noktayı, eski rotadaki her noktaya karşı kontrol et.
    for (const newCoord of newRoute) {
        for (const oldCoord of existingRoute) {
            const distance = calculateDistance(
                newCoord.latitude, 
                newCoord.longitude, 
                oldCoord.latitude, 
                oldCoord.longitude
            );
            
            if (distance <= gaspEşigiKm) {
                // Herhangi bir nokta, eşiğin altındaysa çakışma var say
                return true; 
            }
        }
    }
    return false;
};