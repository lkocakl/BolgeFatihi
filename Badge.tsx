import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING, FONT_SIZES, SHADOWS } from '../constants/theme';
import { useTheme } from '../ThemeContext';

interface BadgeProps {
    name: string;
    description: string;
    icon: string;
    isUnlocked: boolean;
}

const Badge = ({ name, description, icon, isUnlocked }: BadgeProps) => {
    const { colors, isDark } = useTheme();

    return (
        <View style={[
            styles.container,
            { backgroundColor: colors.surface },
            !isUnlocked && { backgroundColor: isDark ? '#333' : '#F5F5F5', opacity: 0.7 }
        ]}>
            <LinearGradient
                colors={isUnlocked ? colors.primaryGradient as [string, string] : ['#BDBDBD', '#757575']}
                style={styles.iconContainer}
            >
                <MaterialCommunityIcons
                    name={icon as any}
                    size={24}
                    color={isUnlocked ? 'white' : '#E0E0E0'}
                />
            </LinearGradient>
            <View style={styles.textContainer}>
                <Text style={[styles.name, { color: colors.text }, !isUnlocked && { color: colors.textSecondary }]}>{name}</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
            </View>
            {!isUnlocked && (
                <MaterialCommunityIcons name="lock" size={16} color={colors.textSecondary} style={styles.lockIcon} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
        borderRadius: 12,
        marginBottom: SPACING.s,
        ...SHADOWS.small,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.m,
    },
    textContainer: {
        flex: 1,
    },
    name: {
        fontSize: FONT_SIZES.m,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    description: {
        fontSize: FONT_SIZES.xs,
    },
    lockIcon: {
        marginLeft: SPACING.s,
    },
});

export default Badge;