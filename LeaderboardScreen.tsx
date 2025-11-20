import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { COLORS, SPACING, FONT_SIZES, SHADOWS } from './constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface UserEntry {
  userId: string;
  username: string;
  totalScore: number;
  profileImage?: string;
}

const LeaderboardScreen = () => {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<UserEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  // Aktif sekme mantığını basitleştirdik çünkü artık tek bir puan kaynağımız var (totalScore)
  // İleride isterseniz "totalDistance" gibi farklı sıralamalar ekleyebilirsiniz.
  
  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // OPTİMİZASYON: Binlerce rotayı çekmek yerine sadece en yüksek puanlı 50 kullanıcıyı çekiyoruz.
      const usersRef = collection(db, "users");
      const q = query(usersRef, orderBy("totalScore", "desc"), limit(50));
      
      const querySnapshot = await getDocs(q);
      const users: UserEntry[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          userId: doc.id,
          username: data.username || 'İsimsiz Fatih',
          totalScore: data.totalScore || 0,
          profileImage: data.profileImage
        });
      });

      setLeaderboard(users);
    } catch (error) {
      console.error("Liderlik tablosu hatası:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  const renderItem = ({ item, index }: { item: UserEntry, index: number }) => {
    const isTop3 = index < 3;
    const rankColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : COLORS.textSecondary;

    return (
      <View style={[styles.row, isTop3 && styles.top3Row]}>
        <View style={styles.rankContainer}>
            {index === 0 ? (
               <MaterialCommunityIcons name="crown" size={24} color="#FFD700" />
            ) : (
               <Text style={[styles.rank, { color: rankColor }]}>#{index + 1}</Text>
            )}
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.username, isTop3 && styles.top3Text]}>{item.username}</Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={[styles.score, { color: isTop3 ? COLORS.primary : COLORS.secondaryDark }]}>{item.totalScore} PTS</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
       <LinearGradient colors={[COLORS.surface, '#F0F4C3']} style={StyleSheet.absoluteFill} />
       
       <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Liderlik Tablosu</Text>
        <Text style={styles.headerSubtitle}>Bölgenin Fatihleri</Text>
       </View>
       
       {loading ? (
         <View style={styles.centerContainer}>
             <ActivityIndicator size="large" color={COLORS.primary} />
             <Text style={styles.loadingText}>Sıralama Yükleniyor...</Text>
         </View>
       ) : (
         <FlatList
            data={leaderboard}
            keyExtractor={(item) => item.userId}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="trophy-broken" size={64} color={COLORS.textSecondary} />
                  <Text style={styles.emptyText}>Henüz veri yok</Text>
                </View>
            }
         />
       )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginTop: 50,
  },
  loadingText: {
    marginTop: SPACING.m,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.m,
  },
  headerContainer: {
    paddingTop: SPACING.xl + 20,
    paddingBottom: SPACING.l,
    paddingHorizontal: SPACING.l,
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...SHADOWS.small,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '800',
    color: COLORS.primaryDark,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.s,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  listContent: {
    paddingHorizontal: SPACING.m,
    paddingTop: SPACING.m,
    paddingBottom: SPACING.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    marginBottom: SPACING.s,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    ...SHADOWS.small,
  },
  top3Row: {
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    backgroundColor: '#FFFDE7',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rank: {
    fontSize: FONT_SIZES.l,
    fontWeight: '900',
  },
  userInfo: {
    flex: 1,
    marginLeft: SPACING.s,
  },
  username: {
    fontSize: FONT_SIZES.m,
    color: COLORS.text,
    fontWeight: '700',
  },
  top3Text: {
    color: COLORS.primaryDark,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: FONT_SIZES.l,
    fontWeight: '800',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  emptyText: {
    marginTop: SPACING.m,
    fontSize: FONT_SIZES.m,
    color: COLORS.textSecondary,
  }
});

export default LeaderboardScreen;