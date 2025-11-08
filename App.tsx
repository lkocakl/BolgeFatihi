import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons'; 
// 🔥 YENİ EKLENENLER: Yükleme ekranı ve stil için
import { ActivityIndicator, View, StyleSheet } from 'react-native'; 
// 🔥 YENİ EKLENENLER: Firebase Auth durumunu dinlemek için
import { onAuthStateChanged, User } from 'firebase/auth'; 
import { auth } from './firebaseConfig'; 

// Ana ekranlar
import MapScreen from './MapScreen'; 
import LeaderboardScreen from './LeaderboardScreen';
import ProfileScreen from './ProfileScreen';
// 🔥 YENİ: AuthScreen'i (Giriş/Kayıt) import ediyoruz
import AuthScreen from './AuthScreen';

const Tab = createBottomTabNavigator();

// 🔥 YENİ: Ana uygulama (Tab Navigator) ayrı bir bileşen yapıldı
// Bu bileşen SADECE kullanıcı giriş yaptığında gösterilecek
const MainAppTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Harita') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Liderler') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Profil') {
            iconName = focused ? 'person-circle' : 'person-circle-outline';
          }
          // @ts-ignore
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF0000',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Harita" component={MapScreen} />
      <Tab.Screen name="Liderler" component={LeaderboardScreen} /> 
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const App = () => {
  // 🔥 YENİ: Kullanıcı oturum durumunu ve yükleme durumunu tut
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔥 YENİ: Firebase Auth durumunu dinle
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Kullanıcı varsa state'e ata, yoksa null ata
      setLoading(false); // Dinleme tamamlandı, yükleme bitti
    });

    // Temizleme fonksiyonu: Bileşen kaldırıldığında dinlemeyi durdur
    return () => unsubscribe();
  }, []);

  // 🔥 YENİ: Oturum kontrolü beklenirken yükleme ekranı göster
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {/* 🔥 YENİ: Koşullu Görüntüleme (Conditional Rendering)
        - 'user' state'i doluysa (giriş yapmışsa) -> MainAppTabs'i göster
        - 'user' state'i null ise (giriş yapmamışsa) -> AuthScreen'i göster
      */}
      {user ? (
        <MainAppTabs /> 
      ) : (
        <AuthScreen /> 
      )}
    </NavigationContainer>
  );
};

// 🔥 YENİ: Yükleme ekranı için stil
const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5' // veya 'transparent'
  }
});

export default App;
