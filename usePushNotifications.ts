import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as Constants from 'expo-constants';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Uygulama açıkken bildirim gelirse nasıl davranacağını ayarla
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const usePushNotifications = (user: any) => {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
  const [notification, setNotification] = useState<Notifications.Notification | boolean>(false);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Token alma ve izin isteme fonksiyonu
  async function registerForPushNotificationsAsync() {
    let token;

    const isExpoGo = Constants.default.appOwnership === 'expo';

    if (Platform.OS === 'android' && isExpoGo) {
      console.log(
        'Expo Go Android push bildirimlerini desteklemiyor. Development build kullanın: https://docs.expo.dev/develop/development-builds/introduction/'
      );
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Bildirim izni alınamadı!');
        return;
      }

      // Expo Push Token'ı al (ProjectId önemlidir)
      // Not: app.json içinde eas.projectId olduğundan emin olunmalı veya manuel girilmeli
      try {
        const projectId = Constants.default.expoConfig?.extra?.eas?.projectId ?? Constants.default.easConfig?.projectId;
        if (!projectId) {
          console.log("Project ID bulunamadı, token alınamıyor.");
          // Geliştirme ortamında (Expo Go) projectId olmadan da çalışabilir ama build alınca gerekir.
        }

        token = (await Notifications.getExpoPushTokenAsync({
          projectId,
        })).data;

        console.log("Expo Push Token:", token);
      } catch (e) {
        console.error("Token alma hatası:", e);
      }
    } else {
      console.log('Fiziksel cihaz gereklidir (Emülatörde push notification çalışmaz)');
    }

    return token;
  }

  useEffect(() => {
    // 1. İzin iste ve Token al
    registerForPushNotificationsAsync().then(token => {
      setExpoPushToken(token);

      // 2. Eğer kullanıcı giriş yapmışsa, token'ı Firestore'a kaydet
      if (user && token) {
        const userRef = doc(db, "users", user.uid);
        updateDoc(userRef, {
          expoPushToken: token
        }).catch(err => console.log("Token Firestore'a kaydedilemedi:", err));
      }
    });

    // 3. Bildirim dinleyicilerini ayarla
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user]);

  return {
    expoPushToken,
    notification,
  };
};