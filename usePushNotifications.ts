import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as Constants from 'expo-constants';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { navigate } from '../navigationRef'; // [YENİ]

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

  async function registerForPushNotificationsAsync() {
    let token;
    const isExpoGo = Constants.default.appOwnership === 'expo';

    if (Platform.OS === 'android' && isExpoGo) {
      console.log('Expo Go Android push bildirimlerini desteklemiyor. Development build kullanın.');
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

      try {
        const projectId = Constants.default.expoConfig?.extra?.eas?.projectId ?? Constants.default.easConfig?.projectId;
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
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
    registerForPushNotificationsAsync().then(token => {
      setExpoPushToken(token);
      if (user && token) {
        const userRef = doc(db, "users", user.uid);
        updateDoc(userRef, { expoPushToken: token }).catch(err => console.log("Token Firestore'a kaydedilemedi:", err));
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // [YENİ] Bildirime tıklanma olayı ve yönlendirme
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;

      // Sohbet mesajı ise ChatScreen'e git
      if (data?.type === 'chat' && data?.chatId) {
        navigate('ChatScreen', {
          chatId: data.chatId,
          friendId: data.friendId,
          friendName: data.friendName,
          profileImage: data.profileImage
        });
      }

      // Gasp bildirimi ise Harita'ya git
      if (data?.type === 'gasp') {
        navigate('Harita');
      }

      // Arkadaş isteği ise Sosyal'e git
      if (data?.type === 'request') {
        navigate('Sosyal');
      }
    });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, [user]);

  return { expoPushToken, notification };
};