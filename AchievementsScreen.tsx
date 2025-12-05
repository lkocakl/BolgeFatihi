import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { useAuth } from './AuthContext';
import { SPACING, FONT_SIZES } from './constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Badge from './components/Badge';
import { useTheme } from './ThemeContext';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

const AchievementsScreen = () => {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const { t, i18n } = useTranslation();
    const navigation = useNavigation();
    const [stats, setStats] = useState({ totalDistance: 0, totalRoutes: 0, totalScore: 0 });
    const [loading, setLoading] = useState(true);

    // [YENİ] Başlığı güncelle
    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: t('achievements.title')
        });
    }, [navigation, i18n.language]);

    useEffect(() => {
        if (!user) return;
        const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
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
        { id: 'first_step', name: t('achievements.badges.first_step.name'), description: t('achievements.badges.first_step.desc'), icon: 'shoe-print', isUnlocked: stats.totalRoutes >= 1 },
        { id: 'explorer', name: t('achievements.badges.explorer.name'), description: t('achievements.badges.explorer.desc'), icon: 'compass', isUnlocked: stats.totalRoutes >= 5 },
        { id: 'marathoner', name: t('achievements.badges.marathoner.name'), description: t('achievements.badges.marathoner.desc'), icon: 'run', isUnlocked: stats.totalDistance >= 42 },
        { id: 'conqueror', name: t('achievements.badges.conqueror.name'), description: t('achievements.badges.conqueror.desc'), icon: 'crown', isUnlocked: stats.totalScore >= 1000 }
    ];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient colors={isDark ? [colors.surface, colors.background] : [colors.surface, '#E8F5E9']} style={StyleSheet.absoluteFill} />
            {loading ? (
                <View style={styles.centerContainer}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Text style={[styles.headerTitle, { color: colors.primaryDark }]}>{t('achievements.title')}</Text>
                        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{t('achievements.subtitle')}</Text>
                    </View>
                    <View style={styles.badgesContainer}>
                        {badges.map(badge => <Badge key={badge.id} {...badge} />)}
                    </View>
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: SPACING.l },
    header: { marginBottom: SPACING.l, alignItems: 'center' },
    headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: 'bold' },
    headerSubtitle: { fontSize: FONT_SIZES.m, marginTop: SPACING.xs },
    badgesContainer: { gap: SPACING.m }
});

export default AchievementsScreen;