import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, SHADOWS } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

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
    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onToggleTracking();
    };

    return (
        <>
            {/* Stats Card - Floating Top Left */}
            {isTracking && (
                <View style={styles.statCard}>
                    <View style={styles.statRow}>
                        <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.primary} />
                        <Text style={styles.statValue}>{formatDuration(runDuration)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statRow}>
                        <MaterialCommunityIcons name="map-marker-distance" size={20} color={COLORS.secondaryDark} />
                        <Text style={styles.statValue}>{distanceKm.toFixed(2)} <Text style={styles.unit}>KM</Text></Text>
                    </View>
                </View>
            )}

            {/* Bottom Control Button */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    onPress={handlePress}
                    disabled={isSaving}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={
                            (isSaving ? [COLORS.textSecondary, COLORS.textSecondary] :
                                isTracking ? [COLORS.error, '#B71C1C'] :
                                    COLORS.primaryGradient) as [string, string, ...string[]]
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
                                ? 'KAYDEDİLİYOR...'
                                : isTracking
                                    ? 'DURDUR & KAYDET'
                                    : 'KOŞUYA BAŞLA'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    statCard: {
        position: 'absolute',
        top: 60,
        left: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 16,
        padding: SPACING.m,
        ...SHADOWS.medium,
        zIndex: 100,
        minWidth: 140,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
    },
    statValue: {
        fontSize: FONT_SIZES.l,
        fontWeight: '700',
        color: COLORS.text,
        marginLeft: SPACING.s,
    },
    unit: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginVertical: SPACING.s,
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 50,
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: SPACING.l,
    },
    mainButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        paddingHorizontal: 40,
        borderRadius: 30,
        width: width * 0.8,
        ...SHADOWS.medium,
    },
    buttonText: {
        color: 'white',
        fontSize: FONT_SIZES.m,
        fontWeight: '800',
        letterSpacing: 1,
    },
});

export default TrackingControls;
