import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, LayoutAnimation, Platform, UIManager, ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { useAuth } from './AuthContext';
import { useAlert } from './AlertContext';
import { SPACING, FONT_SIZES, SHADOWS } from './constants/theme';
import { useTheme } from './ThemeContext';
import { useTranslation } from 'react-i18next';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CONSUMABLE_ITEMS = [
    { id: 'item_shield', type: 'item', nameKey: 'shop.items.shield', value: 'shield', price: 500, icon: 'shield-check', descKey: 'shop.items.shieldDesc' },
    { id: 'potion_x2', type: 'potion', nameKey: 'shop.items.potion', value: 'x2_potion', price: 500, icon: 'flask', descKey: 'shop.items.potionDesc' },
];

const COLOR_ITEMS = [
    { id: 'color_gold', type: 'color', nameKey: 'shop.items.gold', value: '#FFD700', price: 50, icon: 'palette' },
    { id: 'color_neon', type: 'color', nameKey: 'shop.items.neon', value: '#39FF14', price: 50, icon: 'palette' },
    { id: 'color_purple', type: 'color', nameKey: 'shop.items.purple', value: '#9C27B0', price: 50, icon: 'palette' },
    { id: 'color_fire', type: 'color', nameKey: 'shop.items.fire', value: '#FF4500', price: 50, icon: 'palette' },
    { id: 'color_ocean', type: 'color', nameKey: 'shop.items.ocean', value: '#00BFFF', price: 50, icon: 'palette' },
    { id: 'color_pink', type: 'color', nameKey: 'shop.items.pink', value: '#FF69B4', price: 50, icon: 'palette' },
];

const ShopScreen = () => {
    const { user, userProfile } = useAuth();
    const { showAlert } = useAlert();
    const { colors, isDark } = useTheme();
    const { t } = useTranslation();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [colorsExpanded, setColorsExpanded] = useState(false);

    const toggleColors = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setColorsExpanded(!colorsExpanded);
    };

    const handlePurchase = async (item: any) => {
        if (!user || !userProfile) return;
        const currentScore = userProfile.totalScore || 0;
        const ownedColors = userProfile.inventory?.colors || [];

        if (item.type === 'color' && ownedColors.includes(item.value)) {
            activateColor(item.value);
            return;
        }
        if (item.type === 'potion' && userProfile.inventory?.activePotion) {
            showAlert(t('common.warning'), t('shop.active'), 'warning');
            return;
        }
        if (currentScore < item.price) {
            showAlert(t('shop.insufficientFunds'), t('shop.insufficientFundsMsg'), 'warning');
            return;
        }

        setLoadingId(item.id);
        try {
            const userRef = doc(db, "users", user.uid);
            const updateData: any = { totalScore: increment(-item.price) };

            if (item.type === 'color') {
                updateData["inventory.colors"] = arrayUnion(item.value);
                updateData["inventory.activeColor"] = item.value;
            } else if (item.type === 'potion') {
                updateData["inventory.activePotion"] = item.value;
            } else if (item.type === 'item' && item.value === 'shield') {
                updateData["inventory.shields"] = increment(1);
            }

            await updateDoc(userRef, updateData);
            showAlert(t('common.success'), `${t(item.nameKey)} ${t('shop.owned')}`, 'success');
        } catch (error) {
            showAlert(t('common.error'), "İşlem başarısız.", 'error');
        } finally {
            setLoadingId(null);
        }
    };

    const activateColor = async (colorValue: string) => {
        if (!user) return;
        setLoadingId(colorValue);
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { "inventory.activeColor": colorValue });
            showAlert(t('common.success'), "Renk güncellendi!", 'success');
        } catch (error) {
            console.error("Hata:", error);
        } finally {
            setLoadingId(null);
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const ownedColors = userProfile?.inventory?.colors || [];
        const isOwnedColor = item.type === 'color' && ownedColors.includes(item.value);
        const isActiveColor = userProfile?.inventory?.activeColor === item.value;
        const isActivePotion = item.type === 'potion' && userProfile?.inventory?.activePotion === item.value;
        const shieldCount = userProfile?.inventory?.shields || 0;

        let buttonText = t('shop.buy');
        let buttonStyle: any = styles.buyButton;
        let disabled = false;
        let infoText = item.descKey ? t(item.descKey) : '';

        if (item.type === 'color') {
            if (isActiveColor) {
                buttonText = t('shop.active');
                buttonStyle = [styles.buyButton, { backgroundColor: '#BDBDBD' }];
                disabled = true;
            } else if (isOwnedColor) {
                buttonText = t('shop.use');
                buttonStyle = [styles.buyButton, { backgroundColor: colors.secondary }];
            }
        } else if (item.type === 'potion') {
            if (isActivePotion) {
                buttonText = t('shop.active');
                buttonStyle = [styles.buyButton, { backgroundColor: '#BDBDBD' }];
                disabled = true;
            }
        } else if (item.type === 'item' && item.value === 'shield') {
            infoText = `${t('shop.stock')}: ${shieldCount} • ${t(item.descKey)}`;
        }

        return (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <View style={[styles.iconContainer, { backgroundColor: item.type === 'color' ? item.value : (isDark ? '#333' : '#E0F7FA'), borderColor: colors.border }]}>
                    <MaterialCommunityIcons
                        name={item.icon as any}
                        size={32}
                        color={item.type === 'color' ? 'white' : colors.primary}
                    />
                </View>
                <View style={styles.infoContainer}>
                    <Text style={[styles.itemName, { color: colors.text }]}>{t(item.nameKey)}</Text>
                    <Text style={[styles.itemPrice, { color: colors.textSecondary }]}>
                        {(item.type === 'color' && isOwnedColor) || (item.type === 'potion' && isActivePotion)
                            ? (isActivePotion || isActiveColor ? t('shop.inUse') : t('shop.owned'))
                            : `${item.price} ${t('profile.points')}`}
                    </Text>
                    {infoText !== '' && (
                        <Text style={[styles.infoText, { color: colors.primary }]} numberOfLines={1}>{infoText}</Text>
                    )}
                </View>
                <TouchableOpacity
                    style={buttonStyle}
                    onPress={() => handlePurchase(item)}
                    disabled={loadingId !== null || disabled}
                >
                    {loadingId === item.id || loadingId === item.value ? (
                        <ActivityIndicator color="white" size="small" />
                    ) : (
                        <Text style={styles.buyButtonText}>{buttonText}</Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient colors={isDark ? [colors.surface, colors.background] : [colors.surface, '#F0F4C3']} style={StyleSheet.absoluteFill} />

            <View style={[styles.headerContainer, { backgroundColor: colors.surface }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={[styles.headerTitle, { color: colors.primaryDark }]}>{t('shop.title')}</Text>
                        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{t('shop.subtitle')}</Text>
                    </View>
                    <View style={[styles.scoreBadge, { backgroundColor: isDark ? '#333' : '#FFFDE7', borderColor: 'rgba(255, 215, 0, 0.3)' }]}>
                        <MaterialCommunityIcons name="star" size={20} color="#FFD700" />
                        <Text style={[styles.scoreText, { color: colors.text }]}>{userProfile?.totalScore || 0}</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={[styles.sectionHeader, { color: colors.text }]}>{t('shop.boosters')}</Text>
                {CONSUMABLE_ITEMS.map(item => (
                    <View key={item.id}>{renderItem({ item })}</View>
                ))}

                <TouchableOpacity style={[styles.accordionHeader, { backgroundColor: colors.surface }]} onPress={toggleColors} activeOpacity={0.8}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.iconContainer, { backgroundColor: '#E1BEE7', marginRight: SPACING.m, borderColor: colors.border }]}>
                            <MaterialCommunityIcons name="palette" size={28} color="#8E24AA" />
                        </View>
                        <View>
                            <Text style={[styles.accordionTitle, { color: colors.text }]}>{t('shop.colors')}</Text>
                            <Text style={[styles.accordionSubtitle, { color: colors.textSecondary }]}>{t('shop.colorsSubtitle')}</Text>
                        </View>
                    </View>
                    <MaterialCommunityIcons name={colorsExpanded ? "chevron-up" : "chevron-down"} size={24} color={colors.textSecondary} />
                </TouchableOpacity>

                {colorsExpanded && (
                    <View style={styles.accordionContent}>
                        {COLOR_ITEMS.map(item => (
                            <View key={item.id}>{renderItem({ item })}</View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerContainer: {
        paddingTop: SPACING.xl + 20,
        paddingBottom: SPACING.l,
        paddingHorizontal: SPACING.l,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        ...SHADOWS.small,
        zIndex: 10,
    },
    headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: '800' },
    headerSubtitle: { fontSize: FONT_SIZES.s, marginTop: SPACING.xs },
    scoreBadge: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
        borderWidth: 1,
    },
    scoreText: { marginLeft: 5, fontWeight: '800', fontSize: FONT_SIZES.m },
    scrollContent: { padding: SPACING.m, paddingBottom: 40 },
    sectionHeader: { fontSize: FONT_SIZES.l, fontWeight: 'bold', marginBottom: SPACING.m, marginLeft: SPACING.xs, marginTop: SPACING.s },
    card: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 16, padding: SPACING.m, marginBottom: SPACING.s, ...SHADOWS.small,
    },
    iconContainer: {
        width: 50, height: 50, borderRadius: 25,
        justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m,
        borderWidth: 1
    },
    infoContainer: { flex: 1 },
    itemName: { fontSize: FONT_SIZES.m, fontWeight: '700' },
    itemPrice: { fontSize: FONT_SIZES.s, marginTop: 2 },
    infoText: { fontSize: 11, marginTop: 2, fontWeight: '600' },
    buyButton: {
        backgroundColor: '#4CAF50', paddingVertical: 8, paddingHorizontal: 12,
        borderRadius: 8, minWidth: 80, alignItems: 'center'
    },
    buyButtonText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    accordionHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: SPACING.m, borderRadius: 16,
        marginTop: SPACING.m, marginBottom: SPACING.s, ...SHADOWS.small
    },
    accordionTitle: { fontSize: FONT_SIZES.l, fontWeight: 'bold' },
    accordionSubtitle: { fontSize: FONT_SIZES.s },
    accordionContent: { paddingLeft: SPACING.s, marginTop: SPACING.xs }
});

export default ShopScreen;