import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// Auth işlemleri ve Kalıcılık için gerekli importlar
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// 1. FIREBASE AYARLARI
const firebaseConfig = {
  apiKey: "AIzaSyBv5eDtYJ0mdJNAVD-MPwohkO1j5FL1MiE",
  authDomain: "bolgefatihiapp.firebaseapp.com",
  projectId: "bolgefatihiapp",
  // [DÜZELTME 1] Konsoldaki gerçek bucket adresini buraya yazın. 
  // Genellikle 'proje-id.firebasestorage.app' formatındadır.
  // Eğer konsolda farklı bir şey görüyorsanız onu yazın (başında gs:// olmadan).
  storageBucket: "bolgefatihiapp.firebasestorage.app", 
  messagingSenderId: "60838907029",
  appId: "1:60838907029:web:ec947256191abfaafddf9c",
};

// 2. Firebase uygulamasını başlat
export const app = initializeApp(firebaseConfig);

// 3. Firestore'u al
export const db = getFirestore(app);

// 4. [DÜZELTME 2] Storage'ı yapılandırmadan otomatik al (Config'deki storageBucket'ı kullanır)
// Eğer içine manuel string yazarsanız ("gs://...") hata riski artar. 
// Boş bırakınca yukarıdaki config'i kullanır.
export const storage = getStorage(app);

// 5. [DÜZELTME 3] Auth modülünü kalıcılık (persistence) ayarıyla başlat
// (Kullanıcı uygulamayı kapatıp açınca çıkış yapmasın diye)
let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
} catch (e) {
  // Eğer auth zaten initialize edildiyse (hot reload durumlarında) mevcut olanı al
  authInstance = getAuth(app);
}

export const auth = authInstance;