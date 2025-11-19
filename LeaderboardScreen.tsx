import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Image } from 'react-native';
import { collection, query, onSnapshot, DocumentData, QuerySnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { useUserMap } from './hooks/useUserMap';
import { COLORS, SPACING, FONT_SIZES, SHADOWS } from './constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface LeaderboardEntry {
  userId: string;
  username: string;
  totalScore: number;
}

type ScoreMap = { [userId: string]: number; }
type LeaderboardType = 'competition' | 'allTime';

const LeaderboardScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ownerScores, setOwnerScores] = useState<ScoreMap>({});
  const [creatorScores, setCreatorScores] = useState<ScoreMap>({});
  const { userMap, loading: userMapLoading } = useUserMap();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeTab, setActiveTab] = useState<LeaderboardType>('competition');

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setLoading(true);
    setTimeout(() => {
      setRefreshing(false);
      setLoading(false);
    }, 500);
  }, []);

  useEffect(() => {
    const routesCollectionRef = collection(db, "routes");
    const q = query(routesCollectionRef);

    const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
      const newOwnerScores: ScoreMap = {};
      const newCreatorScores: ScoreMap = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const gaspScore = data['gaspScore'] || 0;
        const ownerId = data['ownerId'] || data['userId'] || 'Bilinmeyen';
        newOwnerScores[ownerId] = (newOwnerScores[ownerId] || 0) + gaspScore;
        const creatorId = data['userId'] || 'Bilinmeyen';
        newCreatorScores[creatorId] = (newCreatorScores[creatorId] || 0) + gaspScore;
      });

      setOwnerScores(newOwnerScores);
      setCreatorScores(newCreatorScores);
      setLoading(false);
    }, (error) => {
      console.error("Liderlik tablosu verisi çekilirken hata oluştu: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const scoresToUse = (activeTab === 'competition') ? ownerScores : creatorScores;
    const sortedLeaderboard: LeaderboardEntry[] = Object.keys(scoresToUse)
      .map(userId => ({
        userId: userId,
        username: userMap[userId] || (userId === 'Bilinmeyen' ? userId : `...@${userId.substring(userId.length - 6)}`),
        totalScore: scoresToUse[userId]
      }))
      .sort((a, b) => b.totalScore - a.totalScore);

    setLeaderboard(sortedLeaderboard);
  }, [activeTab, ownerScores, creatorScores, userMap]);

  const renderItem = ({ item, index }: { item: LeaderboardEntry, index: number }) => {
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
          <Text style={styles.scoreLabel}>{activeTab === 'competition' ? 'Fethedilen Puan' : 'Toplam Puan'}</Text>
        </View>

        <View style={styles.scoreContainer}>
          <Text style={[styles.score, { color: isTop3 ? COLORS.primary : COLORS.secondaryDark }]}>
            {item.totalScore}
          </Text>
          <Text style={styles.pts}>PTS</Text>
        </View>
      </View>
    );
  };

  if (loading || userMapLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Sıralama Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.surface, '#F0F4C3']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Liderlik Tablosu</Text>
        <Text style={styles.headerSubtitle}>Bölgenin En İyileri</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'competition' && styles.tabButtonActive]}
          onPress={() => setActiveTab('competition')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'competition' && styles.tabTextActive]}>🏆 Bölge Sahipleri</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'allTime' && styles.tabButtonActive]}
          onPress={() => setActiveTab('allTime')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'allTime' && styles.tabTextActive]}>⚡ En Aktifler</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={leaderboard}
        keyExtractor={(item) => item.userId}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="trophy-broken" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Henüz veri yok</Text>
          </View>
        }
      />
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
    backgroundColor: COLORS.background,
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
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.l,
    marginTop: SPACING.l,
    marginBottom: SPACING.m,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 16,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.small,
  },
  tabText: {
    fontSize: FONT_SIZES.s,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: SPACING.m,
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
  scoreLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: FONT_SIZES.l,
    fontWeight: '800',
  },
  pts: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
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