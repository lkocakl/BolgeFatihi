// App.tsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack'; // YENİ
import { Ionicons } from '@expo/vector-icons'; 

// YENİ: AuthProvider ve useAuth
import { AuthProvider, useAuth } from './AuthContext'; 

// Ana ekranlar
import MapScreen from './MapScreen'; 
import LeaderboardScreen from './LeaderboardScreen';
import ProfileScreen from './ProfileScreen';
import AuthScreen from './AuthScreen';

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator(); // YENİ

// Ana uygulama (Tab Navigator)
const MainAppTabs = () => {
  // Kullanıcı durumunu Context'ten al
  const { user } = useAuth();

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
        // --- DEĞİŞİKLİK ---
        tabBarActiveTintColor: '#FF5722', // '#FF0000' yerine Enerji Turuncusu
        // --- DEĞİŞİKLİK SONU ---
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Harita" component={MapScreen} />
      <Tab.Screen name="Liderler" component={LeaderboardScreen} /> 
      
      {/* KRİTİK DEĞİŞİKLİK: Profil sekmesine "listener" (dinleyici) ekle */}
      <Tab.Screen 
        name="Profil" 
        component={ProfileScreen} 
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Eğer kullanıcı giriş yapmamışsa...
            if (!user) {
              // 1. Profil ekranına gitmeyi engelle
              e.preventDefault();
              // 2. Bunun yerine "Auth" modalını aç
              // @ts-ignore (navigate metodu tiplerden dolayı hata verirse)
              navigation.navigate('AuthModal');
            }
            // (Giriş yapmışsa normal şekilde devam eder)
          },
        })}
      />
    </Tab.Navigator>
  );
};

// YENİ: Ana Stack Navigator
// Uygulamanın tamamını (sekmeler) ve modalı (giriş) yönetir
const AppNavigator = () => {
  return (
    <RootStack.Navigator>
      <RootStack.Screen 
        name="AppTabs" // Ana uygulama (Sekmeler)
        component={MainAppTabs}
        options={{ headerShown: false }} 
      />
      <RootStack.Screen 
        name="AuthModal" // Giriş ekranı (Modal)
        component={AuthScreen}
        options={{ 
          presentation: 'modal', // Bu, ekranın alttan kayarak açılmasını sağlar
          headerTitle: 'Giriş Yap veya Kaydol'
        }}
      />
    </RootStack.Navigator>
  );
};

// Ana App bileşeni
const App = () => {
  // App.tsx'teki tüm state ve useEffect'ler kaldırıldı (AuthContext'e taşındı)
  
  return (
    // AuthProvider tüm uygulamayı sarmalar
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
};

export default App;
