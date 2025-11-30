import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { useAuth } from './AuthContext';
import { COLORS, SPACING, FONT_SIZES, SHADOWS } from './constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Badge from './components/Badge';

const AchievementsScreen = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalDistance: 0,
        totalRoutes: 0,
        totalScore: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const userDocRef = doc(db, "users", user.uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setStats({
                    totalDistance: data.totalDistance || 0,
                    totalRoutes: data.totalRoutes || 0,
                    totalScore: data.totalScore || 0
                });
            }
            setLoading(false);
        });
        return unsubscribe;
    }, [user]);

    const badges = [
        { id: 'first_step', name: 'İlk Adım', description: 'İlk rotanı kaydet', icon: 'shoe-print', isUnlocked: stats.totalRoutes >= 1 },
        { id: 'explorer', name: 'Kaşif', description: '5 fetih yap', icon: 'compass', isUnlocked: stats.totalRoutes >= 5 },
        { id: 'marathoner', name: 'Maratoncu', description: 'Toplam 42km koş', icon: 'run', isUnlocked: stats.totalDistance >= 42 },
        { id: 'conqueror', name: 'Fatih', description: '1000 puan topla', icon: 'crown', isUnlocked: stats.totalScore >= 1000 }
    ];

    return (
        <View style={styles.container}>
            <LinearGradient colors={[COLORS.surface, '#E8F5E9']} style={StyleSheet.absoluteFill} />
            
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Başarımlarım</Text>
                        <Text style={styles.headerSubtitle}>Kilitleri aç, rozetleri topla!</Text>
                    </View>
                    
                    <View style={styles.badgesContainer}>
                        {badges.map(badge => (
                            <Badge key={badge.id} {...badge} />
                        ))}
                    </View>
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: SPACING.l },
    header: { marginBottom: SPACING.l, alignItems: 'center' },
    headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', color: COLORS.primaryDark },
    headerSubtitle: { fontSize: FONT_SIZES.m, color: COLORS.textSecondary, marginTop: SPACING.xs },
    badgesContainer: { gap: SPACING.m }
});

export default AchievementsScreen;