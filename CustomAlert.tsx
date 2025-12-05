import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SPACING, FONT_SIZES, SHADOWS } from '../constants/theme';
import { useTheme } from '../ThemeContext'; // [YENİ] Tema kullanımı

export interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'cancel' | 'default' | 'destructive';
}

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message: string;
    onClose: () => void;
    type?: 'success' | 'error' | 'warning' | 'info';
    buttons?: AlertButton[];
}

const { width } = Dimensions.get('window');

const CustomAlert = ({ visible, title, message, onClose, type = 'warning', buttons }: CustomAlertProps) => {
    const { colors, isDark } = useTheme(); // [YENİ]

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
            case 'success': return colors.success;
            case 'error': return colors.error;
            case 'warning': return colors.warning;
            default: return colors.secondary;
        }
    };

    const actionButtons = buttons && buttons.length > 0 ? buttons : [{ text: 'Tamam', onPress: onClose }];

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.surface }]}>
                    <LinearGradient
                        // Dark modda gradient yerine düz renk veya koyu geçiş
                        colors={isDark ? [colors.surface, colors.surface] : [colors.surface, '#F5F5F5']}
                        style={styles.content}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: getColor() + '20' }]}>
                            <MaterialCommunityIcons name={getIcon()} size={40} color={getColor()} />
                        </View>

                        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

                        <View style={styles.buttonContainer}>
                            {actionButtons.map((btn, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => {
                                        if (btn.onPress) btn.onPress();
                                        onClose();
                                    }}
                                    style={[
                                        styles.button,
                                        btn.style === 'cancel' ? { backgroundColor: isDark ? '#333' : '#E0E0E0' } : {},
                                        actionButtons.length > 1 ? { flex: 1, marginHorizontal: 5 } : { width: '100%' }
                                    ]}
                                >
                                    {btn.style !== 'cancel' ? (
                                        <LinearGradient
                                            colors={btn.style === 'destructive' ? [colors.error, '#D32F2F'] : colors.primaryGradient as [string, string]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.gradient}
                                        >
                                            <Text style={styles.buttonText}>{btn.text}</Text>
                                        </LinearGradient>
                                    ) : (
                                        <View style={styles.cancelButtonInner}>
                                            <Text style={[styles.buttonText, { color: colors.textSecondary }]}>{btn.text}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
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
        marginBottom: SPACING.s,
        textAlign: 'center',
    },
    message: {
        fontSize: FONT_SIZES.m,
        textAlign: 'center',
        marginBottom: SPACING.l,
        lineHeight: 22,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        marginTop: SPACING.s,
    },
    button: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    cancelButtonInner: {
        paddingVertical: SPACING.m,
        alignItems: 'center',
        justifyContent: 'center'
    },
    gradient: {
        paddingVertical: SPACING.m,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%'
    },
    buttonText: {
        color: 'white',
        fontSize: FONT_SIZES.m,
        fontWeight: 'bold',
    },
});

export default CustomAlert;