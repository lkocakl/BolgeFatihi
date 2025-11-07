import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator } from 'react-native';
import { collection, query, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';

interface LeaderboardEntry {
  userId: string;
  totalScore: number;
}

// Liderlik tablosu bileşeni
const LeaderboardScreen = () => {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const routesCollectionRef = collection(db, "routes");
    const q = query(routesCollectionRef);
    
    // 🔥 onSnapshot ile gerçek zamanlı dinleme 🔥
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userScores: { [userId: string]: number } = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const userId = data.userId || 'Bilinmeyen Kullanıcı';
        const gaspScore = data.gaspScore || 0;
        
        // Kullanıcı bazında puanları topla
        userScores[userId] = (userScores[userId] || 0) + gaspScore;
      });

      // Skorları diziye çevir ve sırala
      const sortedLeaderboard: LeaderboardEntry[] = Object.keys(userScores)
        .map(userId => ({
          userId: userId,
          totalScore: userScores[userId]
        }))
        .sort((a, b) => b.totalScore - a.totalScore); // Yüksek puandan düşüğe sırala

      setLeaderboard(sortedLeaderboard);
      setLoading(false);
    }, (error) => {
      console.error("Liderlik tablosu verisi çekilirken hata oluştu: ", error);
      setLoading(false);
    });

    // Temizleme fonksiyonu: Bileşen kaldırıldığında dinlemeyi durdur
    return () => unsubscribe();
  }, []);

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
        keyExtractor={(item) => item.userId}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={[styles.rank, { color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#333' }]}>
              #{index + 1}
            </Text>
            <Text style={styles.userId}>{item.userId}</Text>
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