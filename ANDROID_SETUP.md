# Android Emülatörde Bölge Fatihi Uygulamasını Açma

Android emülatörde uygulamanızı açmak için iki yöntem var:

## Yöntem 1: Development Build (Önerilen - Background Location için gerekli)

Bu yöntem, background location tracking gibi native özelliklerin çalışması için gereklidir.

### Adımlar:

1. **Android emülatörünüzün çalıştığından emin olun**
   ```bash
   # Emülatörü başlatmak için (Android Studio'dan veya)
   emulator -avd <emulator_name>
   ```

2. **Proje dizinine gidin**
   ```bash
   cd BolgeFatihi
   ```

3. **Native projeyi oluşturun (ilk kez)**
   ```bash
   npx expo prebuild --platform android
   ```
   Bu komut `android/` klasörünü oluşturur.

4. **Uygulamayı emülatöre yükleyin ve çalıştırın**
   ```bash
   npx expo run:android
   ```
   
   Veya:
   ```bash
   npm run android
   ```

   Bu komut:
   - Android projesini derler
   - APK'yı emülatöre yükler
   - Uygulamayı başlatır

### İlk Build Zaman Alabilir
İlk build 5-10 dakika sürebilir. Sonraki build'ler çok daha hızlı olacaktır.

---

## Yöntem 2: Expo Go (Hızlı test için - Background location çalışmaz)

Bu yöntem daha hızlıdır ama background location gibi native özellikler çalışmaz.

### Adımlar:

1. **Android emülatörünüzün çalıştığından emin olun**

2. **Expo Go uygulamasını emülatöre yükleyin**
   - Google Play Store'dan "Expo Go" uygulamasını indirin
   - Veya: `adb install path/to/expo-go.apk`

3. **Expo development server'ı başlatın**
   ```bash
   npm start
   ```
   veya
   ```bash
   npx expo start
   ```

4. **QR kodu tarayın veya 'a' tuşuna basın**
   - Terminal'de 'a' tuşuna basın (Android için)
   - Veya QR kodu Expo Go uygulamasıyla tarayın

---

## Sorun Giderme

### "No devices found" hatası

1. **ADB bağlantısını kontrol edin:**
   ```bash
   adb devices
   ```
   Emülatör listede görünmeli.

2. **Emülatörü yeniden başlatın**

3. **ADB server'ı yeniden başlatın:**
   ```bash
   adb kill-server
   adb start-server
   ```

### "Gradle build failed" hatası

1. **Android SDK'yı kontrol edin:**
   - Android Studio'yu açın
   - SDK Manager'dan gerekli SDK'ları yükleyin

2. **Gradle cache'i temizleyin:**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

### "Package name conflict" hatası

`app.json`'daki package name'i kontrol edin. Zaten yüklü bir uygulama varsa:
- Eski uygulamayı silin: `adb uninstall com.kocak.BolgeFatihi`
- Veya `app.json`'da package name'i değiştirin

### Konum izinleri çalışmıyor

1. **Emülatörde konum ayarlarını kontrol edin:**
   - Settings > Location > ON
   - Settings > Apps > BolgeFatihi > Permissions > Location > Allow all the time

2. **Emülatör konumunu ayarlayın:**
   - Emülatör menüsünden (üç nokta) > Location
   - Veya: `adb emu geo fix <longitude> <latitude>`

---

## Hızlı Komutlar

```bash
# Development build oluştur ve çalıştır
npm run android

# Sadece Expo server başlat (Expo Go için)
npm start

# Emülatör cihazlarını listele
adb devices

# Emülatöre APK yükle (manuel)
adb install path/to/app.apk

# Uygulamayı kaldır
adb uninstall com.kocak.BolgeFatihi

# Logları görüntüle
adb logcat | grep ReactNativeJS
```

---

## Önerilen Yöntem

**Background location tracking** özelliğini test etmek için **Yöntem 1 (Development Build)** kullanın.

Expo Go'da background location çalışmaz çünkü native modüller gereklidir.

---

## İlk Build Sonrası

İlk build'den sonra, kod değişikliklerini görmek için:
- Development build'de: Hot reload otomatik çalışır
- Expo Go'da: 'r' tuşuna basarak reload edin


