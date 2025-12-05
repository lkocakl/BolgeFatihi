import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { useAuth } from './AuthContext';
import { SPACING, SHADOWS, FONT_SIZES } from './constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

interface RouteHistoryItem {
  id: string;
  distanceKm: number;
  durationSeconds: number;
  baseScore: number;
  claimedAt: Timestamp;
  gaspScore?: number;
}

const RouteHistoryScreen = () => {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const [routes, setRoutes] = useState<RouteHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // [YENİ] Başlığı dinamik olarak güncelle
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t('routeHistory.title')
    });
  }, [navigation, i18n.language]);

  useEffect(() => {
    if (!user) return;
    const fetchRoutes = async () => {
      try {
        const routesRef = collection(db, "routes");
        const q = query(routesRef, where("userId", "==", user.uid), orderBy("claimedAt", "desc"));
        const snapshot = await getDocs(q);
        const fetchedRoutes: RouteHistoryItem[] = snapshot.docs.map(doc => ({
          id: doc.id, ...doc.data()
        } as RouteHistoryItem));
        setRoutes(fetchedRoutes);
      } catch (error) {
        console.error("Geçmiş hatası:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
  }, [user]);

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    // [YENİ] Dile göre tarih formatı
    const locale = i18n.language === 'tr' ? 'tr-TR' : 'en-US';
    return timestamp.toDate().toLocaleDateString(locale, {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    // [YENİ] Dile göre süre formatı
    return `${m} ${t('common.min')} ${s} ${t('common.sec')}`;
  };

  const renderItem = ({ item }: { item: RouteHistoryItem }) => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name="calendar-clock" size={18} color={colors.textSecondary} style={{ marginRight: 5 }} />
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate(item.claimedAt)}</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: isDark ? '#333' : '#FFF8E1', borderColor: isDark ? '#555' : '#FFECB3' }]}>
          <Text style={styles.scoreText}>+{item.baseScore + (item.gaspScore || 0)} {t('social.score')}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="map-marker-distance" size={24} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{item.distanceKm.toFixed(2)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('routeHistory.km')}</Text>
        </View>

        <View style={[styles.verticalLine, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <MaterialCommunityIcons name="timer-outline" size={24} color={colors.secondary} />
          <Text style={[styles.statValue, { color: colors.text }]}>{formatDuration(item.durationSeconds)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('routeHistory.time')}</Text>
        </View>

        <View style={[styles.verticalLine, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <MaterialCommunityIcons name="fire" size={24} color="#FF5722" />
          <Text style={[styles.statValue, { color: colors.text }]}>{(item.distanceKm * 60).toFixed(0)}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('routeHistory.cal')}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={routes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="run-fast" size={60} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.text }]}>{t('routeHistory.empty')}</Text>
              <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>{t('routeHistory.emptySub')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: SPACING.m },
  card: {
    borderRadius: 16, padding: SPACING.m, marginBottom: SPACING.m, ...SHADOWS.small
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.s },
  dateText: { fontSize: FONT_SIZES.s, fontWeight: '600' },
  scoreBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1,
  },
  scoreText: { color: '#FF8F00', fontWeight: 'bold', fontSize: FONT_SIZES.s },
  divider: { height: 1, marginVertical: SPACING.s },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  statLabel: { fontSize: 12 },
  verticalLine: { width: 1, height: 30 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: 'bold', marginTop: SPACING.m },
  emptySubText: { fontSize: 14, marginTop: SPACING.s, textAlign: 'center' }
});

export default RouteHistoryScreen;