# Bölge Fatihi 🏃‍♂️🗺️

Bölge Fatihi, koşu rotalarınızı haritada takip edip bölgeleri fethetmenizi sağlayan eğlenceli bir mobil uygulamadır. Koştuğunuz rotaları kaydedin, diğer kullanıcıların bölgelerini ele geçirin ve liderlik tablosunda üst sıralara çıkın!

## ✨ Özellikler

- 🗺️ **Harita Tabanlı Rota Takibi**: Koşu rotalarınızı gerçek zamanlı olarak haritada görüntüleyin
- 🏆 **Bölge Fethetme**: Koştuğunuz rotaları kaydederek bölgeleri fethedin
- ⚔️ **Bölge Gasp Etme**: Diğer kullanıcıların rotalarıyla kesişen rotalar oluşturarak bölgeleri ele geçirin
- 📊 **Liderlik Tablosu**: Rekabet ve tüm zamanlar liderlik tablolarında sıralamanızı görün
- 👤 **Profil Yönetimi**: İstatistiklerinizi görüntüleyin ve profil bilgilerinizi güncelleyin
- 🔐 **Güvenli Giriş**: Email/şifre ile güvenli giriş yapın

## 🚀 Kurulum

### Gereksinimler

- Node.js (v16 veya üzeri)
- npm veya yarn
- Expo CLI
- Firebase hesabı

### Adımlar

1. **Projeyi klonlayın veya indirin**
   ```bash
   cd BolgeFatihi
   ```

2. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

3. **Firebase yapılandırmasını ayarlayın**
   
   `firebaseConfig.ts` dosyasındaki Firebase yapılandırma bilgilerini kendi Firebase projenizden alın:
   - Firebase Console'dan proje ayarlarına gidin
   - Web uygulaması ekleyin
   - Yapılandırma bilgilerini kopyalayın
   - `firebaseConfig.ts` dosyasına yapıştırın

4. **Firebase Firestore Kurallarını Ayarlayın**
   
   Firebase Console > Firestore Database > Rules bölümüne gidin ve şu kuralları ekleyin:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read: if true;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
       match /routes/{routeId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

5. **Uygulamayı başlatın**
   ```bash
   npm start
   ```

6. **Cihazınızda test edin**
   - Expo Go uygulamasını telefonunuza indirin
   - QR kodu tarayın veya
   - Android için: `npm run android`
   - iOS için: `npm run ios`

## 📱 Kullanım

### İlk Kullanım

1. Uygulamayı açın
2. "Profil" sekmesine gidin ve "Giriş Yap" veya "Kaydol" butonuna tıklayın
3. Email ve şifre ile hesap oluşturun veya giriş yapın

### Koşu Başlatma

1. "Harita" sekmesine gidin
2. "Koşuya Başla" butonuna tıklayın
3. Konum izni verin (gerekli)
4. Koşunuzu tamamlayın
5. "Durdur & Kaydet" butonuna tıklayın
6. Rotanız kaydedilir ve bölge fethedilir!

### Bölge Gasp Etme

- Başka bir kullanıcının rotasıyla kesişen bir rota oluşturun
- Rotanız kaydedildiğinde, kesişen bölgeler otomatik olarak size geçer
- Gasp ettiğiniz her bölge için ekstra puan kazanırsınız!

### Liderlik Tablosu

- "Liderler" sekmesine gidin
- "Rekabet" sekmesinde mevcut sahiplik puanlarını görün
- "Tüm Zamanlar" sekmesinde toplam puanları görün

## 🛠️ Teknolojiler

- **React Native** - Mobil uygulama framework'ü
- **Expo** - Geliştirme platformu
- **Firebase** - Backend servisleri (Authentication, Firestore)
- **React Navigation** - Navigasyon
- **React Native Maps** - Harita görüntüleme
- **Turf.js** - Coğrafi hesaplamalar
- **TypeScript** - Tip güvenliği

## 📁 Proje Yapısı

```
BolgeFatihi/
├── App.tsx                 # Ana uygulama bileşeni ve navigasyon
├── AuthContext.tsx         # Kimlik doğrulama context'i
├── AuthScreen.tsx          # Giriş/Kayıt ekranı
├── MapScreen.tsx           # Harita ve rota takibi ekranı
├── ProfileScreen.tsx       # Kullanıcı profili ekranı
├── LeaderboardScreen.tsx   # Liderlik tablosu ekranı
├── firebaseConfig.ts       # Firebase yapılandırması
├── utils.ts                # Yardımcı fonksiyonlar
└── assets/                 # Görseller ve ikonlar
```

## 🔒 Güvenlik

- Firebase Authentication ile güvenli kullanıcı yönetimi
- Firestore Security Rules ile veri erişim kontrolü
- Şifre sıfırlama özelliği
- Email doğrulama desteği

## 🎨 Tasarım

Uygulama, doğa temalı renk paleti kullanır:
- **Sağlık Yeşili** (#388E3C) - Ana aksiyon butonları
- **Gökyüzü Mavisi** (#1E88E5) - İkincil butonlar ve linkler
- **Kiremit Kırmızısı** (#D32F2F) - Durdurma butonları
- **Açık Toprak Rengi** (#F4F4F1) - Arka plan

## 🐛 Bilinen Sorunlar

- Arka plan konum takibi henüz tam olarak desteklenmiyor
- Çok fazla rota olduğunda harita performansı düşebilir

## 🚧 Gelecek Özellikler

- [ ] Push bildirimleri
- [ ] Sosyal özellikler (arkadaşlar, meydan okumalar)
- [ ] Rota geçmişi ve detayları
- [ ] Başarımlar ve rozetler
- [ ] Karanlık mod desteği
- [ ] Çevrimdışı mod desteği
- [ ] Rota paylaşma özelliği

## 📝 Lisans

Bu proje özel bir projedir.

## 👨‍💻 Geliştirici

Sorularınız veya önerileriniz için issue açabilirsiniz.

---

**Not**: Bu uygulamayı kullanmak için aktif bir internet bağlantısı ve konum izni gereklidir.


