import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, SHADOWS } from '../constants/theme';

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    onClose: () => void;
    type?: 'success' | 'error' | 'warning' | 'info';
}

const { width } = Dimensions.get('window');

const CustomAlert = ({ visible, title, message, onClose, type = 'warning' }: CustomAlertProps) => {
    const getIcon = () => {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'alert-circle';
            case 'warning': return 'alert';
            default: return 'information';
        }
    };

    const getColor = () => {
        switch (type) {
            case 'success': return COLORS.primary;
            case 'error': return COLORS.error;
            case 'warning': return '#FFA000';
            default: return COLORS.secondary;
        }
    };

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <LinearGradient
                        colors={[COLORS.surface, '#F5F5F5']}
                        style={styles.content}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: getColor() + '20' }]}>
                            <MaterialCommunityIcons name={getIcon()} size={40} color={getColor()} />
                        </View>

                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>

                        <TouchableOpacity onPress={onClose} style={styles.buttonContainer}>
                            <LinearGradient
                                colors={COLORS.primaryGradient as [string, string, ...string[]]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.button}
                            >
                                <Text style={styles.buttonText}>Tamam</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: width * 0.85,
        borderRadius: 20,
        overflow: 'hidden',
        ...SHADOWS.medium,
    },
    content: {
        padding: SPACING.l,
        alignItems: 'center',
    },
    iconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    title: {
        fontSize: FONT_SIZES.l,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.s,
        textAlign: 'center',
    },
    message: {
        fontSize: FONT_SIZES.m,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.l,
        lineHeight: 22,
    },
    buttonContainer: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
    },
    button: {
        paddingVertical: SPACING.m,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: FONT_SIZES.m,
        fontWeight: 'bold',
    },
});

export default CustomAlert;
