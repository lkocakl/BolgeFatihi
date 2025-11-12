// AuthContext.tsx

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

interface AuthContextType {
  user: User | null;
}

// 1. Context'i oluştur
const AuthContext = createContext<AuthContextType>({ user: null });

interface AuthProviderProps {
  children: ReactNode;
}

// 2. Provider'ı (Sağlayıcı) oluştur
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Başlangıçta yükleniyor

  useEffect(() => {
    // Bu kod App.tsx'ten taşındı
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Oturum durumu kontrol edilirken yükleme ekranı göster
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        {/* --- DEĞİŞİKLİK --- */}
        <ActivityIndicator size="large" color="#388E3C" />
        {/* --- DEĞİŞİKLİK SONU --- */}
      </View>
    );
  }

  // Yükleme bittiyse ve kullanıcı durumu belliyse (null veya dolu),
  // uygulamayı (children) AuthContext.Provider ile sarmala
  return (
    <AuthContext.Provider value={{ user }}>
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
