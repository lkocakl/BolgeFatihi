import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, FONT_SIZES, SHADOWS } from '../constants/theme';

interface BadgeProps {
    name: string;
    description: string;
    icon: string;
    isUnlocked: boolean;
}

const Badge = ({ name, description, icon, isUnlocked }: BadgeProps) => {
    return (
        <View style={[styles.container, !isUnlocked && styles.lockedContainer]}>
            <LinearGradient
                colors={isUnlocked ? COLORS.primaryGradient as [string, string, ...string[]] : ['#E0E0E0', '#BDBDBD']}
                style={styles.iconContainer}
            >
                <MaterialCommunityIcons
                    name={icon as any}
                    size={24}
                    color={isUnlocked ? 'white' : '#757575'}
                />
            </LinearGradient>
            <View style={styles.textContainer}>
                <Text style={[styles.name, !isUnlocked && styles.lockedText]}>{name}</Text>
                <Text style={styles.description}>{description}</Text>
            </View>
            {!isUnlocked && (
                <MaterialCommunityIcons name="lock" size={16} color="#757575" style={styles.lockIcon} />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: SPACING.m,
        borderRadius: 12,
        marginBottom: SPACING.s,
        ...SHADOWS.small,
    },
    lockedContainer: {
        opacity: 0.7,
        backgroundColor: '#F5F5F5',
        elevation: 0,
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
        color: COLORS.text,
        marginBottom: 2,
    },
    lockedText: {
        color: '#757575',
    },
    description: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
    },
    lockIcon: {
        marginLeft: SPACING.s,
    },
});

export default Badge;
