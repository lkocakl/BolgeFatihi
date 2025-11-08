import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';

// Arayüz (Değişiklik yok)
interface LeaderboardEntry {
  userId: string;
  username: string;
  totalScore: number;
}

// Tipler (Değişiklik yok)
type UserMap = {
  [userId: string]: string;
}
type ScoreMap = {
  [userId: string]: number;
}

const LeaderboardScreen = () => {
  const [loading, setLoading] = useState(true);
  
  const [scores, setScores] = useState<ScoreMap>({}); 
  const [userMap, setUserMap] = useState<UserMap>({}); 
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]); 

  // 1. Adım - 'users' koleksiyonunu dinle (Değişiklik yok)
  useEffect(() => {
    const usersCollectionRef = collection(db, "users");
    const q = query(usersCollectionRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const newMap: UserMap = {};
      querySnapshot.forEach((doc) => {
        newMap[doc.id] = doc.data().username || `...@${doc.id.substring(doc.id.length - 6)}`;
      });
      setUserMap(newMap);
      console.log("Liderlik: Kullanıcı haritası güncellendi.");
    }, (error) => {
      console.error("Kullanıcı verisi çekilirken hata oluştu: ", error);
    });

    return () => unsubscribe();
  }, []); 

  // 2. Adım - 'routes' koleksiyonunu dinle (🔥 KRİTİK DEĞİŞİKLİK BURADA)
  useEffect(() => {
    const routesCollectionRef = collection(db, "routes");
    const q = query(routesCollectionRef);
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      // 🔥 DEĞİŞİKLİK: 'userScores' -> 'ownerScores' (Sahiplik puanları)
      const ownerScores: ScoreMap = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // 🔥 DEĞİŞİKLİK: Puanları 'userId' yerine 'ownerId' (sahiplik) üzerinden topla
        // 'ownerId' yoksa (eski veriler için) 'userId'yi kullan
        const ownerId = data.ownerId || data.userId || 'Bilinmeyen Kullanıcı';
        const gaspScore = data.gaspScore || 0;
        
        // Puanları 'ownerId' anahtarı altında topla
        ownerScores[ownerId] = (ownerScores[ownerId] || 0) + gaspScore;
      });

      setScores(ownerScores); // 'scores' state'ini güncelle
    }, (error) => {
      console.error("Liderlik tablosu verisi çekilirken hata oluştu: ", error);
      setLoading(false); 
    });

    return () => unsubscribe();
  }, []); 

  // 3. Adım - Verileri Birleştir (🔥 DEĞİŞİKLİK BURADA)
  useEffect(() => {
    // 🔥 DEĞİŞİKLİK: 'scores' map'inin key'leri artık 'ownerId'leri temsil ediyor
    const sortedLeaderboard: LeaderboardEntry[] = Object.keys(scores)
      .map(ownerId => ({ // 'userId' -> 'ownerId' (daha anlaşılır)
        userId: ownerId, // 'userId' prop'u olarak 'ownerId'yi kullan
        // userMap'ten kullanıcı adını 'ownerId' ile bul
        username: userMap[ownerId] || (ownerId === 'Bilinmeyen Kullanıcı' ? ownerId : `...@${ownerId.substring(ownerId.length - 6)}`),
        totalScore: scores[ownerId] // Puanı 'ownerId' ile al
      }))
      .sort((a, b) => b.totalScore - a.totalScore); 

    setLeaderboard(sortedLeaderboard);
    
    if (loading) {
      setLoading(false);
    }

  }, [scores, userMap]); // 'scores' veya 'userMap' her değiştiğinde bu blok çalışır

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF0000" />
        <Text style={styles.text}>Liderlik Tablosu Yükleniyor...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.header}>🏆 Bölge Gasp Liderleri</Text>
      <FlatList
        data={leaderboard}
        keyExtractor={(item) => item.userId} // 'userId' (aslında 'ownerId')
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={[styles.rank, { color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#333' }]}>
              #{index + 1}
            </Text>
            {/* 'item.username' (Değişiklik yok, zaten 'userMap'ten geliyordu) */}
            <Text style={styles.userId}>{item.username}</Text>
            <Text style={styles.score}>{item.totalScore} Puan</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#f5f5f5', // Arka plan rengini 'f5f5ff' idi, 'f5f5f5' olarak düzelttim
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: '900',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    marginBottom: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    width: 40,
  },
  userId: { 
    flex: 1,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF0000',
  },
  text: {
      marginTop: 20,
      fontSize: 16,
      color: '#666',
  }
});

export default LeaderboardScreen;
