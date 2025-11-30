import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, SHADOWS, SPACING } from '../constants/theme';

interface LocationPermissionModalProps {
    visible: boolean;
    onAccept: () => void;
    onDecline: () => void;
}

const LocationPermissionModal = ({ visible, onAccept, onDecline }: LocationPermissionModalProps) => {
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onDecline}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View style={styles.iconContainer}>
                        <MaterialCommunityIcons name="map-marker-radius" size={48} color={COLORS.primary} />
                    </View>
                    
                    <Text style={styles.modalTitle}>Konum İzni Hakkında</Text>
                    
                    <Text style={styles.modalText}>
                        Bölge Fatihi, aşağıdaki özellikleri sağlayabilmek için <Text style={styles.bold}>uygulama kapalıyken veya kullanılmıyorken bile</Text> konum verilerinizi toplar:
                    </Text>

                    <View style={styles.bulletPoints}>
                        <View style={styles.bulletItem}>
                            <MaterialCommunityIcons name="run" size={20} color={COLORS.textSecondary} />
                            <Text style={styles.bulletText}>Koşu rotanızı haritada çizmek</Text>
                        </View>
                        <View style={styles.bulletItem}>
                            <MaterialCommunityIcons name="map-marker-distance" size={20} color={COLORS.textSecondary} />
                            <Text style={styles.bulletText}>Toplam mesafenizi hesaplamak</Text>
                        </View>
                        <View style={styles.bulletItem}>
                            <MaterialCommunityIcons name="flag-checkered" size={20} color={COLORS.textSecondary} />
                            <Text style={styles.bulletText}>Bölge fethetme özelliğini çalıştırmak</Text>
                        </View>
                    </View>

                    <Text style={styles.disclaimer}>
                        Bu veriler sadece koşu sırasında toplanır ve reklam amaçlı kullanılmaz.
                    </Text>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity 
                            style={[styles.button, styles.buttonDecline]} 
                            onPress={onDecline}
                        >
                            <Text style={styles.textDecline}>Reddet</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.button, styles.buttonAccept]} 
                            onPress={onAccept}
                        >
                            <Text style={styles.textAccept}>Kabul Et ve Devam Et</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: SPACING.l
    },
    modalView: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: SPACING.xl,
        alignItems: 'center',
        ...SHADOWS.medium
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.l
    },
    modalTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        marginBottom: SPACING.m,
        textAlign: 'center',
        color: COLORS.text
    },
    modalText: {
        marginBottom: SPACING.l,
        textAlign: 'center',
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.m,
        lineHeight: 22
    },
    bold: {
        fontWeight: 'bold',
        color: COLORS.text
    },
    bulletPoints: {
        width: '100%',
        marginBottom: SPACING.l,
    },
    bulletItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.s,
        paddingHorizontal: SPACING.s
    },
    bulletText: {
        marginLeft: SPACING.s,
        color: COLORS.text,
        fontSize: FONT_SIZES.s,
    },
    disclaimer: {
        fontSize: FONT_SIZES.xs,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
        fontStyle: 'italic'
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: SPACING.m
    },
    button: {
        flex: 1,
        borderRadius: 12,
        padding: SPACING.m,
        elevation: 2,
        alignItems: 'center'
    },
    buttonAccept: {
        backgroundColor: COLORS.primary,
    },
    buttonDecline: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: COLORS.border
    },
    textAccept: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: FONT_SIZES.s
    },
    textDecline: {
        color: COLORS.textSecondary,
        fontWeight: 'bold',
        fontSize: FONT_SIZES.s
    }
});

export default LocationPermissionModal;