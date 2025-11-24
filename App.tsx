// App.tsx

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './AuthContext';
import ErrorBoundary from './ErrorBoundary';

// Ana ekranlar
import MapScreen from './MapScreen';
import LeaderboardScreen from './LeaderboardScreen';
import ProfileScreen from './ProfileScreen';
import AuthScreen from './AuthScreen';

// Push Notification Hook'u [EKLENDİ]
import { usePushNotifications } from './hooks/usePushNotifications';

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

// Ana uygulama (Tab Navigator)
const MainAppTabs = () => {
  // Kullanıcı durumunu Context'ten al
  const { user } = useAuth();

  // Push Bildirim Sistemini Başlat [EKLENDİ]
  usePushNotifications(user);

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
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#388E3C', // Sağlık Yeşili
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Harita" component={MapScreen} />
      <Tab.Screen name="Liderler" component={LeaderboardScreen} />

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
              (navigation as any).navigate('AuthModal');
            }
            // (Giriş yapmışsa normal şekilde devam eder)
          },
        })}
      />
    </Tab.Navigator>
  );
};

// Ana Stack Navigator
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
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;