import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider, useAuth } from './AuthContext';
import { AlertProvider } from './AlertContext';
import ErrorBoundary from './ErrorBoundary';

// Ana ekranlar
import RouteHistoryScreen from './RouteHistoryScreen';
import MapScreen from './MapScreen';
import LeaderboardScreen from './LeaderboardScreen';
import ProfileScreen from './ProfileScreen';
import AuthScreen from './AuthScreen';
import ShopScreen from './ShopScreen';
import OnboardingScreen from './OnboardingScreen';
import SocialScreen from './SocialScreen';
import SocialSearchScreen from './SocialSearchScreen';
import ChatScreen from './ChatScreen';

import { usePushNotifications } from './hooks/usePushNotifications';

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

const MainAppTabs = () => {
  const { user, friendRequestsCount } = useAuth();
  usePushNotifications(user);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Harita') iconName = focused ? 'map' : 'map-outline';
          else if (route.name === 'Liderler') iconName = focused ? 'trophy' : 'trophy-outline';
          else if (route.name === 'Market') iconName = focused ? 'cart' : 'cart-outline';
          else if (route.name === 'Sosyal') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Profil') iconName = focused ? 'person-circle' : 'person-circle-outline';
          
          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#388E3C',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Harita" component={MapScreen} />
      <Tab.Screen name="Liderler" component={LeaderboardScreen} />
      <Tab.Screen name="Market" component={ShopScreen} />
      
      <Tab.Screen 
        name="Sosyal" 
        component={SocialScreen} 
        options={{
            tabBarBadge: friendRequestsCount > 0 ? friendRequestsCount : undefined,
        }}
      />
      
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!user) {
              e.preventDefault();
              (navigation as any).navigate('AuthModal');
            }
          }
        })}
      />
    </Tab.Navigator>
  );
};

const AppContent = () => {
  const [loading, setLoading] = useState(true);
  const [viewedOnboarding, setViewedOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem('@viewedOnboarding');
        if (value !== null) setViewedOnboarding(true);
      } catch (err) {
        console.log('Error', err);
      } finally {
        setLoading(false);
      }
    };
    checkOnboarding();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#388E3C" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!viewedOnboarding && (
          <RootStack.Screen name="Onboarding">
            {props => <OnboardingScreen {...props} onFinish={() => setViewedOnboarding(true)} />}
          </RootStack.Screen>
        )}
        <RootStack.Screen 
  name="RouteHistory" 
  component={RouteHistoryScreen} 
  options={{ headerTitle: 'Geçmiş Koşularım', headerShown: true }} 
/>
        <RootStack.Screen name="AppTabs" component={MainAppTabs} />
        <RootStack.Screen name="AuthModal" component={AuthScreen} options={{ presentation: 'modal', headerShown: true, headerTitle: 'Giriş Yap' }} />
        <RootStack.Screen name="SearchUser" component={SocialSearchScreen} options={{ headerTitle: 'Arkadaş Ekle', headerShown: true }} />
        <RootStack.Screen name="ChatScreen" component={ChatScreen} options={{ headerShown: false }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AlertProvider>
          <AppContent />
        </AlertProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;