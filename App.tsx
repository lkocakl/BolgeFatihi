import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons'; 

// Taşıdığımız ana ekranlar
import MapScreen from './MapScreen'; 
import LeaderboardScreen from './LeaderboardScreen';
import ProfileScreen from './ProfileScreen';

const Tab = createBottomTabNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            
            // İkonların ayarlanması
            if (route.name === 'Harita') {
              iconName = focused ? 'map' : 'map-outline';
            } else if (route.name === 'Liderler') {
              iconName = focused ? 'trophy' : 'trophy-outline'; // Kupa ikonu
            } else if (route.name === 'Profil') {
              iconName = focused ? 'person-circle' : 'person-circle-outline'; // Profil ikonu
            }
            // @ts-ignore
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#FF0000', // Aktif sekme rengi
          tabBarInactiveTintColor: 'gray',
          headerShown: false, // Sayfa başlıklarını gizle
        })}
      >
        <Tab.Screen name="Harita" component={MapScreen} />
        {/* 🚨 LİDERLER SEKMESİ: LeaderboardScreen atanmış olmalı */}
        <Tab.Screen name="Liderler" component={LeaderboardScreen} /> 
        {/* 🚨 PROFİL SEKMESİ: ProfileScreen atanmış olmalı */}
        <Tab.Screen name="Profil" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default App;