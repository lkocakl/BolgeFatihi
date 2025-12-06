import React, { createContext, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useUserStore } from './store/useUserStore';
import { useSocialStore } from './store/useSocialStore';

// Tipleri dışa aktarmaya devam ediyoruz
export interface Quest {
  id: string;
  type: 'DISTANCE' | 'TIME' | 'SCORE' | 'CONQUER';
  target: number;
  progress: number;
  reward: number;
  descriptionKey: string;
  descriptionParams: any;
  isClaimed: boolean;
}

export interface PrivacyZone {
  latitude: number;
  longitude: number;
  radius: number;
  isEnabled: boolean;
}

interface AuthContextType {
  user: User | null;
  userProfile: any | null;
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
  // 1. TÜM HOOK'LAR EN ÜSTTE OLMALI (DÜZELTME BURADA)

  // Setter'lar
  const setUser = useUserStore((s) => s.setUser);
  const setUserProfile = useUserStore((s) => s.setUserProfile);
  const setLoading = useUserStore((s) => s.setLoading);
  const setSocialCounts = useSocialStore((s) => s.setCounts);

  // State'ler (Bunları if(loading)'den önce çağırmalıyız)
  const loading = useUserStore((s) => s.loading);
  const currentUserState = useUserStore((s) => s.user);
  const userProfileState = useUserStore((s) => s.userProfile);
  const friendRequestsCountState = useSocialStore((s) => s.friendRequestsCount);
  const unreadMessagesCountState = useSocialStore((s) => s.unreadMessagesCount);

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;
    let unsubscribeRequests: (() => void) | null = null;
    let unsubscribeChats: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      // Temizlik
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (unsubscribeRequests) unsubscribeRequests();
      if (unsubscribeChats) unsubscribeChats();

      if (currentUser) {
        // 1. Kullanıcı Profili Dinleyicisi
        const userDocRef = doc(db, "users", currentUser.uid);
        unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as any);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        });

        // 2. Arkadaş İstekleri Dinleyicisi
        const requestsQuery = query(
          collection(db, "friend_requests"),
          where("toId", "==", currentUser.uid),
          where("status", "==", "pending")
        );

        unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
          // İstek sayısını güncelle, mesaj sayısını store'dan al
          setSocialCounts(snapshot.size, useSocialStore.getState().unreadMessagesCount);
        });

        // 3. Sohbet Mesajları Dinleyicisi
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
          // Mesaj sayısını güncelle, istek sayısını store'dan al
          setSocialCounts(useSocialStore.getState().friendRequestsCount, totalUnread);
        }, (error) => {
          console.log("Chat dinleme hatası:", error.message);
        });

      } else {
        // Çıkış yapıldı
        setUserProfile(null);
        setSocialCounts(0, 0);
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
    setUser(null);
    setUserProfile(null);
    setSocialCounts(0, 0);
  };

  // 2. HOOK'LARDAN SONRA RETURN YAPABİLİRİZ
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#388E3C" />
      </View>
    );
  }

  // Context değerlerini yukarıda çağırdığımız hook değişkenlerinden alıyoruz
  const contextValue = {
    user: currentUserState,
    userProfile: userProfileState,
    loading: loading,
    friendRequestsCount: friendRequestsCountState,
    unreadMessagesCount: unreadMessagesCountState,
    logout
  };

  return (
    <AuthContext.Provider value={contextValue}>
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