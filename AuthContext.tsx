import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// [GÜNCELLENDİ] Quest yapısı dinamik hale getirildi
export interface Quest {
  id: string;
  type: 'DISTANCE' | 'TIME' | 'SCORE' | 'CONQUER';
  target: number;
  progress: number;
  reward: number;
  descriptionKey: string; // Çeviri anahtarı (örn: 'quests.distance')
  descriptionParams: any; // Parametreler (örn: { target: 5 })
  isClaimed: boolean;
}

export interface PrivacyZone {
  latitude: number;
  longitude: number;
  radius: number;
  isEnabled: boolean;
}

interface UserProfile {
  username?: string;
  email?: string;
  profileImage?: string;
  totalScore: number;
  weeklyScore?: number;
  expoPushToken?: string;
  dailyQuests?: Quest[];
  lastQuestDate?: string;
  friends?: string[];
  privacyZone?: PrivacyZone;
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
  unreadMessagesCount: number;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  friendRequestsCount: 0,
  unreadMessagesCount: 0,
  logout: async () => { }
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendRequestsCount, setFriendRequestsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;
    let unsubscribeRequests: (() => void) | null = null;
    let unsubscribeChats: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (unsubscribeFirestore) unsubscribeFirestore();
      if (unsubscribeRequests) unsubscribeRequests();
      if (unsubscribeChats) unsubscribeChats();

      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        });

        const requestsQuery = query(
          collection(db, "friend_requests"),
          where("toId", "==", currentUser.uid),
          where("status", "==", "pending")
        );

        unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
          setFriendRequestsCount(snapshot.size);
        });

        const chatsQuery = query(
          collection(db, "chats"),
          where("participants", "array-contains", currentUser.uid)
        );

        unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
          let totalUnread = 0;
          snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.unreadCounts && typeof data.unreadCounts[currentUser.uid] === 'number') {
              totalUnread += data.unreadCounts[currentUser.uid];
            }
          });
          setUnreadMessagesCount(totalUnread);
        }, (error) => {
          console.log("Chat dinleme hatası:", error.message);
        });

      } else {
        setUserProfile(null);
        setFriendRequestsCount(0);
        setUnreadMessagesCount(0);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (unsubscribeRequests) unsubscribeRequests();
      if (unsubscribeChats) unsubscribeChats();
    };
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#388E3C" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      friendRequestsCount,
      unreadMessagesCount,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F1'
  }
});