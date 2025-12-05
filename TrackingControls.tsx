import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING, FONT_SIZES, SHADOWS } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next'; // [YENİ]

interface TrackingControlsProps {
    isTracking: boolean;
    isSaving: boolean;
    runDuration: number;
    distanceKm: number;
    onToggleTracking: () => void;
    formatDuration: (ms: number) => string;
}

const { width } = Dimensions.get('window');

const TrackingControls = ({
    isTracking,
    isSaving,
    runDuration,
    distanceKm,
    onToggleTracking,
    formatDuration
}: TrackingControlsProps) => {
    const { colors, isDark } = useTheme();
    const { t } = useTranslation(); // [YENİ]

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onToggleTracking();
    };

    return (
        <>
            {isTracking && (
                <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
                    <View style={styles.statRow}>
                        <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{formatDuration(runDuration)}</Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.statRow}>
                        <MaterialCommunityIcons name="map-marker-distance" size={20} color={colors.secondaryDark} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{distanceKm.toFixed(2)} <Text style={[styles.unit, { color: colors.textSecondary }]}>{t('routeHistory.km')}</Text></Text>
                    </View>
                </View>
            )}

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    onPress={handlePress}
                    disabled={isSaving}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={
                            (isSaving ? [colors.textSecondary, colors.textSecondary] :
                                isTracking ? [colors.error, '#B71C1C'] :
                                    colors.primaryGradient) as [string, string, ...string[]]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.mainButton}
                    >
                        <MaterialCommunityIcons
                            name={isSaving ? "loading" : isTracking ? "stop" : "run"}
                            size={24}
                            color="white"
                            style={{ marginRight: 8 }}
                        />
                        <Text style={styles.buttonText}>
                            {isSaving
                                ? t('map.saving')
                                : isTracking
                                    ? t('map.stopSave')
                                    : t('map.startRun')}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    statCard: {
        position: 'absolute', top: 60, left: 20, borderRadius: 16, padding: SPACING.m, ...SHADOWS.medium, zIndex: 100, minWidth: 140,
    },
    statRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
    statValue: { fontSize: FONT_SIZES.l, fontWeight: '700', marginLeft: SPACING.s },
    unit: { fontSize: FONT_SIZES.xs, fontWeight: '600' },
    divider: { height: 1, marginVertical: SPACING.s },
    buttonContainer: { position: 'absolute', bottom: 50, width: '100%', alignItems: 'center', paddingHorizontal: SPACING.l },
    mainButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 30, width: width * 0.8, ...SHADOWS.medium },
    buttonText: { color: 'white', fontSize: FONT_SIZES.m, fontWeight: '800', letterSpacing: 1 },
});

export default TrackingControls;