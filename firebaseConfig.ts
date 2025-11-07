// BolgeFatihi/firebaseConfig.ts

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// 1. BURAYA KENDİ FIREBASE AYARLARINIZI YAPIŞTIRIN
const firebaseConfig = {
  apiKey: "AIzaSyBv5eDtYJ0mdJNAVD-MPwohkO1j5FL1MiE", 
  authDomain: "bolgefatihiapp.firebaseapp.com",
  projectId: "bolgefatihiapp", 
  storageBucket: "bolgefatihiapp.appspot.com",
  messagingSenderId: "60838907029",
  appId: "1:60838907029:web:ec947256191abfaafddf9c",
  // measurementId: "G-V8XNZEW4R" // Analitik kullanmadığımız için silebiliriz.
};

// 2. Firebase uygulamasını başlat
 export const app = initializeApp(firebaseConfig);

// 3. Firestore veritabanını al ve dışa aktar (Diğer dosyalarda kullanmak için)
export const db = getFirestore(app);
export const auth = getAuth(app);