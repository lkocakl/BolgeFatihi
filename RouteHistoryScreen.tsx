import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { useAuth } from './AuthContext';
import { COLORS, SPACING, SHADOWS, FONT_SIZES } from './constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
  const [routes, setRoutes] = useState<RouteHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchRoutes = async () => {
      try {
        const routesRef = collection(db, "routes");
        // Sadece benim rotalarımı, tarihe göre tersten sırala
        const q = query(
          routesRef,
          where("userId", "==", user.uid),
          orderBy("claimedAt", "desc")
        );

        const snapshot = await getDocs(q);
        const fetchedRoutes: RouteHistoryItem[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as RouteHistoryItem));

        setRoutes(fetchedRoutes);
      } catch (error) {
        console.error("Rota geçmişi çekilirken hata:", error);
        // Not: Eğer konsolda 'index gerekli' hatası görürseniz, verilen linke tıklayıp index oluşturun.
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, [user]);

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    return timestamp.toDate().toLocaleDateString('tr-TR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}dk ${s}sn`;
  };

  const renderItem = ({ item }: { item: RouteHistoryItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
             <MaterialCommunityIcons name="calendar-clock" size={18} color={COLORS.textSecondary} style={{marginRight: 5}} />
             <Text style={styles.dateText}>{formatDate(item.claimedAt)}</Text>
        </View>
        <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>+{item.baseScore + (item.gaspScore || 0)} P</Text>
        </View>
      </View>
      
      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
           <MaterialCommunityIcons name="map-marker-distance" size={24} color={COLORS.primary} />
           <Text style={styles.statValue}>{item.distanceKm.toFixed(2)}</Text>
           <Text style={styles.statLabel}>km</Text>
        </View>
        
        <View style={styles.verticalLine} />

        <View style={styles.statItem}>
           <MaterialCommunityIcons name="timer-outline" size={24} color={COLORS.secondary} />
           <Text style={styles.statValue}>{formatDuration(item.durationSeconds)}</Text>
           <Text style={styles.statLabel}>süre</Text>
        </View>

        <View style={styles.verticalLine} />

        <View style={styles.statItem}>
           <MaterialCommunityIcons name="fire" size={24} color="#FF5722" />
           <Text style={styles.statValue}>{(item.distanceKm * 60).toFixed(0)}</Text>
           <Text style={styles.statLabel}>kcal</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
        <LinearGradient colors={[COLORS.surface, '#E3F2FD']} style={StyleSheet.absoluteFill} />
        {loading ? (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        ) : (
            <FlatList 
                data={routes}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="run-fast" size={60} color={COLORS.textSecondary} />
                        <Text style={styles.emptyText}>Henüz hiç koşu yapmadın.</Text>
                        <Text style={styles.emptySubText}>İlk rotanı kaydetmek için Harita sekmesine git!</Text>
                    </View>
                }
            />
        )}
    </View>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: SPACING.m },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: SPACING.m,
        marginBottom: SPACING.m,
        ...SHADOWS.small
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.s
    },
    dateText: {
        fontSize: FONT_SIZES.s,
        color: COLORS.textSecondary,
        fontWeight: '600'
    },
    scoreBadge: {
        backgroundColor: '#FFF8E1',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFECB3'
    },
    scoreText: {
        color: '#FF8F00',
        fontWeight: 'bold',
        fontSize: FONT_SIZES.s
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: SPACING.s
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center'
    },
    statItem: {
        alignItems: 'center'
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: 4
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textSecondary
    },
    verticalLine: {
        width: 1,
        height: 30,
        backgroundColor: '#F0F0F0'
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: SPACING.m
    },
    emptySubText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: SPACING.s,
        textAlign: 'center'
    }
});

export default RouteHistoryScreen;