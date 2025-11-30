import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// [YENİ] Görev Tipi Tanımı
export interface Quest {
  id: string;
  type: 'DISTANCE' | 'TIME' | 'SCORE' | 'CONQUER';
  target: number;
  progress: number;
  reward: number;
  description: string;
  isClaimed: boolean;
}

interface UserProfile {
  username?: string;
  email?: string;
  profileImage?: string;
  totalScore: number;
  weeklyScore?: number; // Haftalık Lig için
  expoPushToken?: string;
  // [YENİ] Görev alanları
  dailyQuests?: Quest[];
  lastQuestDate?: string; // Görevlerin en son oluşturulduğu tarih (YYYY-MM-DD)
  inventory?: {
      colors?: string[];
      activeColor?: string;
      activePotion?: string | null;
      shields?: number;
  };
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  friendRequestsCount: number;
}

const AuthContext = createContext<AuthContextType>({ 
    user: null, 
    userProfile: null, 
    loading: true,
    friendRequestsCount: 0 
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendRequestsCount, setFriendRequestsCount] = useState(0);

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;
    let unsubscribeRequests: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (unsubscribeFirestore) unsubscribeFirestore();
      if (unsubscribeRequests) unsubscribeRequests();

      if (currentUser) {
        // 1. Profil Dinleyicisi
        const userDocRef = doc(db, "users", currentUser.uid);
        unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        });

        // 2. Arkadaşlık İstekleri Sayısını Dinle
        const requestsQuery = query(
            collection(db, "friend_requests"), 
            where("toId", "==", currentUser.uid), 
            where("status", "==", "pending")
        );

        unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
            setFriendRequestsCount(snapshot.size);
        });

      } else {
        setUserProfile(null);
        setFriendRequestsCount(0);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (unsubscribeRequests) unsubscribeRequests();
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#388E3C" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, friendRequestsCount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F1'
  }
});