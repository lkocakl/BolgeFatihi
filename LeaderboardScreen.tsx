import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { db } from './firebaseConfig';
import { SPACING, FONT_SIZES, SHADOWS } from './constants/theme';
import { useTheme } from './ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next'; // [YENİ]

interface UserEntry {
  userId: string;
  username: string;
  totalScore: number;
  weeklyScore?: number;
  profileImage?: string;
}

const LeaderboardScreen = () => {
  const navigation = useNavigation();
  const { colors, isDark } = useTheme();
  const { t } = useTranslation(); // [YENİ]

  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<UserEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'weekly' | 'all_time'>('weekly');

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const orderByField = activeTab === 'weekly' ? 'weeklyScore' : 'totalScore';
      const q = query(usersRef, orderBy(orderByField, "desc"), limit(50));

      const querySnapshot = await getDocs(q);
      const users: UserEntry[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const wScore = data.weeklyScore || 0;
        if (activeTab === 'weekly' && wScore === 0) return;

        users.push({
          userId: doc.id,
          username: data.username || 'İsimsiz Fatih',
          totalScore: data.totalScore || 0,
          weeklyScore: wScore,
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
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  const renderItem = ({ item, index }: { item: UserEntry, index: number }) => {
    const isTop3 = index < 3;
    const rankColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : colors.textSecondary;
    const displayScore = activeTab === 'weekly' ? item.weeklyScore : item.totalScore;

    const handlePress = () => {
      (navigation as any).navigate('UserProfileScreen', {
        userId: item.userId,
        username: item.username,
        profileImage: item.profileImage
      });
    };

    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        <View style={[
          styles.row,
          { backgroundColor: colors.surface },
          isTop3 && { backgroundColor: isDark ? '#2C2C2C' : '#FFFDE7', borderColor: isDark ? '#444' : 'rgba(255, 215, 0, 0.3)', borderWidth: 1 }
        ]}>
          <View style={styles.rankContainer}>
            {index === 0 ? (
              <MaterialCommunityIcons name="crown" size={24} color="#FFD700" />
            ) : (
              <Text style={[styles.rank, { color: rankColor }]}>#{index + 1}</Text>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.username, { color: colors.text }, isTop3 && { color: colors.primaryDark }]}>{item.username}</Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={[styles.score, { color: isTop3 ? colors.primary : colors.secondaryDark }]}>
              {displayScore} PTS
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={isDark ? [colors.surface, colors.background] : [colors.surface, '#F0F4C3']} style={StyleSheet.absoluteFill} />

      <View style={[styles.headerContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.headerTitle, { color: colors.primaryDark }]}>{t('leaderboard.title')}</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{t('leaderboard.subtitle')}</Text>

        <View style={[styles.tabContainer, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'weekly' && { backgroundColor: isDark ? '#444' : 'white', ...SHADOWS.small }]}
            onPress={() => setActiveTab('weekly')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'weekly' ? colors.primary : colors.textSecondary }]}>{t('leaderboard.weekly')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all_time' && { backgroundColor: isDark ? '#444' : 'white', ...SHADOWS.small }]}
            onPress={() => setActiveTab('all_time')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'all_time' ? colors.primary : colors.textSecondary }]}>{t('leaderboard.allTime')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{t('common.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.userId}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="trophy-broken" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {activeTab === 'weekly' ? t('leaderboard.emptyWeekly') : t('leaderboard.emptyAllTime')}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

// ... (Styles aynı)
const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  loadingText: { marginTop: SPACING.m, fontSize: FONT_SIZES.m },
  headerContainer: {
    paddingTop: SPACING.xl + 20,
    paddingBottom: SPACING.m,
    paddingHorizontal: SPACING.l,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...SHADOWS.small,
    zIndex: 10,
  },
  headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: '800', textAlign: 'center' },
  headerSubtitle: { fontSize: FONT_SIZES.s, textAlign: 'center', marginTop: SPACING.xs, marginBottom: SPACING.m },
  tabContainer: {
    flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 5
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabText: { fontWeight: '600' },
  listContent: { paddingHorizontal: SPACING.m, paddingTop: SPACING.m, paddingBottom: SPACING.xl },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.m, marginBottom: SPACING.s, borderRadius: 16, ...SHADOWS.small,
  },
  rankContainer: { width: 40, alignItems: 'center', justifyContent: 'center' },
  rank: { fontSize: FONT_SIZES.l, fontWeight: '900' },
  userInfo: { flex: 1, marginLeft: SPACING.s },
  username: { fontSize: FONT_SIZES.m, fontWeight: '700' },
  scoreContainer: { alignItems: 'flex-end' },
  score: { fontSize: FONT_SIZES.l, fontWeight: '800' },
  emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  emptyText: { marginTop: SPACING.m, fontSize: FONT_SIZES.m, textAlign: 'center' }
});

export default LeaderboardScreen;