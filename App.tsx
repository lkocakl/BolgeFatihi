import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './AuthContext'; // useAuth buradan kaldırıldı, store kullanacağız
import { useUserStore } from './store/useUserStore'; // [YENİ]
import { useSocialStore } from './store/useSocialStore'; // [YENİ]
import { AlertProvider } from './AlertContext';
import { ThemeProvider, useTheme } from './ThemeContext';
import ErrorBoundary from './ErrorBoundary';
import './i18n';

import UserProfileScreen from './UserProfileScreen';
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
import AchievementsScreen from './AchievementsScreen';

import { usePushNotifications } from './hooks/usePushNotifications';
import { useTranslation } from 'react-i18next';
import { navigationRef } from './navigationRef'; // [YENİ] Navigasyon referansı

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

const AppNavigator = () => {
  const { theme, colors } = useTheme();
  // [YENİ] Store'dan verileri çekiyoruz
  const user = useUserStore(s => s.user);
  const friendRequestsCount = useSocialStore(s => s.friendRequestsCount);
  const unreadMessagesCount = useSocialStore(s => s.unreadMessagesCount);

  const { t } = useTranslation();
  usePushNotifications(user); // Bildirim hook'u burada çalışıyor

  const totalNotifications = friendRequestsCount + unreadMessagesCount;
  const navigationTheme = theme === 'dark' ? DarkTheme : DefaultTheme;

  const MainAppTabs = () => (
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
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerShown: false,
        title: t(`common.${route.name.toLowerCase()}`)
      })}
    >
      <Tab.Screen name="Harita" component={MapScreen} options={{ title: t('map.title') || 'Harita' }} />
      <Tab.Screen name="Liderler" component={LeaderboardScreen} options={{ title: t('leaderboard.title') || 'Liderler' }} />
      <Tab.Screen name="Market" component={ShopScreen} options={{ title: t('shop.title') }} />
      <Tab.Screen name="Sosyal" component={SocialScreen} options={{ title: t('social.title') || 'Sosyal', tabBarBadge: totalNotifications > 0 ? totalNotifications : undefined }} />
      <Tab.Screen name="Profil" component={ProfileScreen} options={{ title: t('profile.title') || 'Profil' }} listeners={({ navigation }) => ({ tabPress: (e) => { if (!user) { e.preventDefault(); (navigation as any).navigate('AuthModal'); } } })} />
    </Tab.Navigator>
  );

  const [loading, setLoading] = useState(true);
  const [viewedOnboarding, setViewedOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem('@viewedOnboarding');
        if (value !== null) setViewedOnboarding(true);
      } catch (err) { } finally {
        setLoading(false);
      }
    };
    checkOnboarding();
  }, []);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    // [YENİ] ref={navigationRef} eklendi
    <NavigationContainer theme={navigationTheme} ref={navigationRef}>
      <RootStack.Navigator initialRouteName="AppTabs" screenOptions={{ headerShown: false }}>
        {!viewedOnboarding && (
          <RootStack.Screen name="Onboarding">
            {props => <OnboardingScreen {...props} onFinish={() => setViewedOnboarding(true)} />}
          </RootStack.Screen>
        )}
        <RootStack.Screen name="AppTabs" component={MainAppTabs} />
        <RootStack.Screen name="AuthModal" component={AuthScreen} options={{ presentation: 'modal', headerShown: true, headerTitle: t('auth.loginTitle') }} />
        <RootStack.Screen name="SearchUser" component={SocialSearchScreen} options={{ headerTitle: t('social.addFriend'), headerShown: true }} />
        <RootStack.Screen name="ChatScreen" component={ChatScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="UserProfileScreen" component={UserProfileScreen} options={{ headerTitle: 'Profil', headerShown: true }} />
        <RootStack.Screen name="Achievements" component={AchievementsScreen} options={{ headerTitle: 'Başarımlar', headerShown: true }} />
        <RootStack.Screen name="RouteHistory" component={RouteHistoryScreen} options={{ headerTitle: 'Geçmiş', headerShown: true }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const App = () => {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <AlertProvider>
              <AppNavigator />
            </AlertProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
};

export default App;