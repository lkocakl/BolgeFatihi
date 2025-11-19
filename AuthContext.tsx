import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

interface UserProfile {
  username?: string;
  email?: string;
  profileImage?: string;
  // Add other profile fields as needed
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

// 1. Context'i oluştur
const AuthContext = createContext<AuthContextType>({ user: null, userProfile: null, loading: true });

interface AuthProviderProps {
  children: ReactNode;
}

// 2. Provider'ı (Sağlayıcı) oluştur
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true); // Başlangıçta yükleniyor

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserProfile(userDocSnap.data() as UserProfile);
          } else {
            setUserProfile(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Oturum durumu kontrol edilirken yükleme ekranı göster
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#388E3C" />
      </View>
    );
  }

  // Yükleme bittiyse ve kullanıcı durumu belliyse (null veya dolu),
  // uygulamayı (children) AuthContext.Provider ile sarmala
  return (
    <AuthContext.Provider value={{ user, userProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Kolay erişim için bir "hook" oluştur
export const useAuth = () => {
  return useContext(AuthContext);
};

// Yükleme stili (YENİ RENKLER)
const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F4F1' // Açık Toprak Rengi
  }
});