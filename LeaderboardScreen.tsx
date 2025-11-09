import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { collection, query, onSnapshot, DocumentData, QuerySnapshot } from 'firebase/firestore';
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

// YENİ: Hangi tip liderlik tablosunu gösterdiğimizi tutan tip
type LeaderboardType = 'competition' | 'allTime';

const LeaderboardScreen = () => {
  const [loading, setLoading] = useState(true);
  
  // DEĞİŞİKLİK: İki farklı skor haritası tutacağız
  const [ownerScores, setOwnerScores] = useState<ScoreMap>({}); // Mevcut Sahiplik (ownerId)
  const [creatorScores, setCreatorScores] = useState<ScoreMap>({}); // Tüm Zamanlar (userId)
  
  const [userMap, setUserMap] = useState<UserMap>({}); 
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]); 

  // YENİ: Hangi tablonun aktif olduğunu tutan state
  const [activeTab, setActiveTab] = useState<LeaderboardType>('competition');


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

  // 2. Adım - 'routes' koleksiyonunu dinle (DEĞİŞTİ)
  useEffect(() => {
    const routesCollectionRef = collection(db, "routes");
    const q = query(routesCollectionRef);
    
    const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      
      const newOwnerScores: ScoreMap = {};
      const newCreatorScores: ScoreMap = {}; // YENİ
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const gaspScore = data['gaspScore'] || 0;

        // 1. Rekabet Skoru (ownerId)
        const ownerId = data['ownerId'] || data['userId'] || 'Bilinmeyen';
        newOwnerScores[ownerId] = (newOwnerScores[ownerId] || 0) + gaspScore;
        
        // 2. Tüm Zamanlar Skoru (userId)
        const creatorId = data['userId'] || 'Bilinmeyen';
        newCreatorScores[creatorId] = (newCreatorScores[creatorId] || 0) + gaspScore;
      });

      setOwnerScores(newOwnerScores); // Rekabet skorunu güncelle
      setCreatorScores(newCreatorScores); // YENİ: Tüm zamanlar skorunu güncelle
      
      setLoading(false); // Veri geldi, yüklemeyi kapat
      
    }, (error) => {
      console.error("Liderlik tablosu verisi çekilirken hata oluştu: ", error);
      setLoading(false); 
    });

    return () => unsubscribe();
  }, []); 

  // 3. Adım - Verileri Birleştir (DEĞİŞTİ)
  useEffect(() => {
    
    // Hangi skor haritasını kullanacağımıza 'activeTab' state'ine göre karar ver
    const scoresToUse = (activeTab === 'competition') ? ownerScores : creatorScores;

    const sortedLeaderboard: LeaderboardEntry[] = Object.keys(scoresToUse)
      .map(userId => ({ 
        userId: userId, 
        // userMap'ten kullanıcı adını bul
        username: userMap[userId] || (userId === 'Bilinmeyen' ? userId : `...@${userId.substring(userId.length - 6)}`),
        totalScore: scoresToUse[userId] // İlgili skor haritasından puanı al
      }))
      .sort((a, b) => b.totalScore - a.totalScore); // Puana göre sırala

    setLeaderboard(sortedLeaderboard);
    
  }, [activeTab, ownerScores, creatorScores, userMap]); // Artık 4 state'e bağımlı

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF5722" />
        <Text style={styles.text}>Liderlik Tablosu Yükleniyor...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      
      {/* YENİ: TAB SEÇİM BUTONLARI */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'competition' && styles.tabButtonActive]}
          onPress={() => setActiveTab('competition')}
        >
          <Text style={[styles.tabText, activeTab === 'competition' && styles.tabTextActive]}>🏆 Rekabet</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'allTime' && styles.tabButtonActive]}
          onPress={() => setActiveTab('allTime')}
        >
          <Text style={[styles.tabText, activeTab === 'allTime' && styles.tabTextActive]}>⏱️ Tüm Zamanlar</Text>
        </TouchableOpacity>
      </View>
      
      {/* DEĞİŞİKLİK: Başlık artık dinamik */}
      <Text style={styles.header}>
        {activeTab === 'competition' ? 'Bölge Gasp Liderleri' : 'Tüm Zamanlar Liderleri'}
      </Text>
      
      {/* FlatList (Değişiklik yok, 'leaderboard' state'ini okur) */}
      <FlatList
        data={leaderboard}
        keyExtractor={(item) => item.userId} 
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={[styles.rank, { color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#333' }]}>
              #{index + 1}
            </Text>
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
    backgroundColor: '#f5f5f5', 
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // YENİ: TAB STİLLERİ
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#FF5722', // Ana "Enerji Turuncusu"
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  tabTextActive: {
    color: '#fff',
  },
  // --- TAB STİLLERİ SONU ---
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
    color: '#2196F3', // "Gökyüzü Mavisi"
    fontWeight: '600',
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFC107', // "Altın Rengi"
  },
  text: {
      marginTop: 20,
      fontSize: 16,
      color: '#666',
  }
});

export default LeaderboardScreen;
