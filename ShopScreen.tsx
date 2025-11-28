import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator, LayoutAnimation, Platform, UIManager, ScrollView 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { useAuth } from './AuthContext';
import { useAlert } from './AlertContext';
import { COLORS, SPACING, FONT_SIZES, SHADOWS } from './constants/theme';

// Android'de animasyonların çalışması için gerekli
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Eşyalar (Kalkan, İksir vb.)
const CONSUMABLE_ITEMS = [
    { id: 'item_shield', type: 'item', name: 'Alan Kalkanı', value: 'shield', price: 500, icon: 'shield-check', desc: 'Bölgelerini 24 saat korur' },
    { id: 'potion_x2', type: 'potion', name: 'x2 Puan İksiri', value: 'x2_potion', price: 500, icon: 'flask', desc: 'Sonraki koşuda puanı katlar' },
];

// Renkler
const COLOR_ITEMS = [
    { id: 'color_gold', type: 'color', name: 'Altın Rota', value: '#FFD700', price: 50, icon: 'palette' },
    { id: 'color_neon', type: 'color', name: 'Neon Yeşil', value: '#39FF14', price: 50, icon: 'palette' },
    { id: 'color_purple', type: 'color', name: 'Asil Mor', value: '#9C27B0', price: 50, icon: 'palette' },
    { id: 'color_fire', type: 'color', name: 'Alev Kırmızı', value: '#FF4500', price: 50, icon: 'palette' },
    { id: 'color_ocean', type: 'color', name: 'Okyanus Mavisi', value: '#00BFFF', price: 50, icon: 'palette' },
    { id: 'color_pink', type: 'color', name: 'Şeker Pembe', value: '#FF69B4', price: 50, icon: 'palette' },
];

const ShopScreen = () => {
    const { user, userProfile } = useAuth();
    const { showAlert } = useAlert();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    
    // Renkler listesinin açık/kapalı durumu
    const [colorsExpanded, setColorsExpanded] = useState(false);

    const toggleColors = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setColorsExpanded(!colorsExpanded);
    };

    const handlePurchase = async (item: any) => {
        if (!user || !userProfile) return;

        const currentScore = userProfile.totalScore || 0;
        const ownedColors = userProfile.inventory?.colors || [];

        // 1. Renk Sahiplik Kontrolü
        if (item.type === 'color' && ownedColors.includes(item.value)) {
            activateColor(item.value);
            return;
        }

        // 2. İksir Kontrolü
        if (item.type === 'potion') {
            if (userProfile.inventory?.activePotion) {
                showAlert("Dikkat", "Zaten aktif bir iksirin var. Önce onu kullanmalısın!", 'warning');
                return;
            }
        }

        // 3. Puan Kontrolü
        if (currentScore < item.price) {
            showAlert("Yetersiz Puan", "Bu ürünü almak için daha fazla koşmalısın!", 'warning');
            return;
        }

        setLoadingId(item.id);
        try {
            const userRef = doc(db, "users", user.uid);
            
            const updateData: any = {
                totalScore: increment(-item.price)
            };

            if (item.type === 'color') {
                updateData["inventory.colors"] = arrayUnion(item.value);
                updateData["inventory.activeColor"] = item.value;
            } else if (item.type === 'potion') {
                updateData["inventory.activePotion"] = item.value;
            } else if (item.type === 'item' && item.value === 'shield') {
                updateData["inventory.shields"] = increment(1);
            }

            await updateDoc(userRef, updateData);

            if (item.type === 'potion') {
                showAlert("İksir Aktif!", "Bir sonraki koşunda kazandığın puanlar 2 ile çarpılacak! 🧪⚡", 'success');
            } else if (item.value === 'shield') {
                showAlert("Kalkan Alındı!", "Artık haritadaki bir bölgeni seçip korumaya alabilirsin. 🛡️", 'success');
            } else {
                showAlert("Hayırlı Olsun!", `${item.name} başarıyla satın alındı ve aktif edildi.`, 'success');
            }

        } catch (error) {
            console.error("Satın alma hatası:", error);
            showAlert("Hata", "İşlem gerçekleştirilemedi.", 'error');
        } finally {
            setLoadingId(null);
        }
    };

    const activateColor = async (colorValue: string) => {
        if (!user) return;
        setLoadingId(colorValue);
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                "inventory.activeColor": colorValue
            });
            showAlert("Başarılı", "Rota rengin güncellendi!", 'success');
        } catch (error) {
            console.error("Renk değiştirme hatası:", error);
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

        let buttonText = 'SATIN AL';
        let buttonStyle: any = styles.buyButton;
        let disabled = false;
        let infoText = item.desc || ''; // Varsa açıklama, yoksa boş
        
        if (item.type === 'color') {
            if (isActiveColor) {
                buttonText = 'AKTİF';
                buttonStyle = [styles.buyButton, styles.activeButton];
                disabled = true;
            } else if (isOwnedColor) {
                buttonText = 'KULLAN';
                buttonStyle = [styles.buyButton, styles.ownedButton];
            }
        } else if (item.type === 'potion') {
            if (isActivePotion) {
                buttonText = 'AKTİF';
                buttonStyle = [styles.buyButton, styles.activeButton];
                disabled = true; 
            }
        } else if (item.type === 'item' && item.value === 'shield') {
             infoText = `Stok: ${shieldCount} • ${item.desc}`;
        }

        return (
            <View style={styles.card}>
                <View style={[styles.iconContainer, { backgroundColor: item.type === 'color' ? item.value : '#E0F7FA' }]}>
                    <MaterialCommunityIcons 
                        name={item.icon as any} 
                        size={32} 
                        color={item.type === 'color' ? 'white' : COLORS.primary} 
                    />
                </View>
                <View style={styles.infoContainer}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    
                    {/* Fiyat veya Durum */}
                    <Text style={styles.itemPrice}>
                        {(item.type === 'color' && isOwnedColor) || (item.type === 'potion' && isActivePotion) 
                            ? (isActivePotion || isActiveColor ? 'Kullanımda' : 'Satın Alındı') 
                            : `${item.price} Puan`}
                    </Text>

                    {/* Alt Bilgi Metni */}
                    {infoText !== '' && (
                        <Text style={styles.infoText} numberOfLines={1}>{infoText}</Text>
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
        <View style={styles.container}>
            <LinearGradient colors={[COLORS.surface, '#F0F4C3']} style={StyleSheet.absoluteFill} />
            
            <View style={styles.headerContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={styles.headerTitle}>Market</Text>
                        <Text style={styles.headerSubtitle}>Gücüne Güç Kat</Text>
                    </View>
                    <View style={styles.scoreBadge}>
                        <MaterialCommunityIcons name="star" size={20} color="#FFD700" />
                        <Text style={styles.scoreText}>{userProfile?.totalScore || 0}</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                {/* Bölüm 1: Eşyalar & Güçlendirmeler */}
                <Text style={styles.sectionHeader}>Güçlendirmeler</Text>
                {CONSUMABLE_ITEMS.map(item => (
                    <View key={item.id}>
                        {renderItem({ item })}
                    </View>
                ))}

                {/* Bölüm 2: Rota Renkleri (Açılır/Kapanır Liste) */}
                <TouchableOpacity style={styles.accordionHeader} onPress={toggleColors} activeOpacity={0.8}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <View style={[styles.iconContainer, { backgroundColor: '#E1BEE7', marginRight: SPACING.m }]}>
                            <MaterialCommunityIcons name="palette" size={28} color="#8E24AA" />
                        </View>
                        <View>
                            <Text style={styles.accordionTitle}>Rota Renkleri</Text>
                            <Text style={styles.accordionSubtitle}>Haritada tarzını konuştur</Text>
                        </View>
                    </View>
                    <MaterialCommunityIcons 
                        name={colorsExpanded ? "chevron-up" : "chevron-down"} 
                        size={24} 
                        color={COLORS.textSecondary} 
                    />
                </TouchableOpacity>

                {/* Açılır Liste İçeriği */}
                {colorsExpanded && (
                    <View style={styles.accordionContent}>
                        {COLOR_ITEMS.map(item => (
                            <View key={item.id}>
                                {renderItem({ item })}
                            </View>
                        ))}
                    </View>
                )}

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    
    headerContainer: {
        paddingTop: SPACING.xl + 20,
        paddingBottom: SPACING.l,
        paddingHorizontal: SPACING.l,
        backgroundColor: COLORS.surface,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        ...SHADOWS.small,
        zIndex: 10,
    },
    headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: '800', color: COLORS.primaryDark },
    headerSubtitle: { fontSize: FONT_SIZES.s, color: COLORS.textSecondary, marginTop: SPACING.xs },
    scoreBadge: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFDE7',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
        borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.3)',
    },
    scoreText: { marginLeft: 5, fontWeight: '800', color: COLORS.text, fontSize: FONT_SIZES.m },
    
    scrollContent: { padding: SPACING.m, paddingBottom: 40 },
    
    sectionHeader: {
        fontSize: FONT_SIZES.l, fontWeight: 'bold', color: COLORS.text,
        marginBottom: SPACING.m, marginLeft: SPACING.xs, marginTop: SPACING.s
    },

    // Kart Stilleri
    card: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
        borderRadius: 16, padding: SPACING.m, marginBottom: SPACING.s, ...SHADOWS.small,
    },
    iconContainer: {
        width: 50, height: 50, borderRadius: 25,
        justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m,
        borderWidth: 1, borderColor: '#EEE'
    },
    infoContainer: { flex: 1 },
    itemName: { fontSize: FONT_SIZES.m, fontWeight: '700', color: COLORS.text },
    itemPrice: { fontSize: FONT_SIZES.s, color: COLORS.textSecondary, marginTop: 2 },
    infoText: { fontSize: 11, color: COLORS.primary, marginTop: 2, fontWeight: '600' },
    
    buyButton: {
        backgroundColor: '#4CAF50', paddingVertical: 8, paddingHorizontal: 12,
        borderRadius: 8, minWidth: 80, alignItems: 'center'
    },
    ownedButton: { backgroundColor: '#2196F3' },
    activeButton: { backgroundColor: '#BDBDBD' },
    buyButtonText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

    // Accordion (Açılır Menü) Stilleri
    accordionHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'white', padding: SPACING.m, borderRadius: 16,
        marginTop: SPACING.m, marginBottom: SPACING.s, ...SHADOWS.small
    },
    accordionTitle: { fontSize: FONT_SIZES.l, fontWeight: 'bold', color: COLORS.text },
    accordionSubtitle: { fontSize: FONT_SIZES.s, color: COLORS.textSecondary },
    accordionContent: {
        paddingLeft: SPACING.s, // Hafif içeriden başlasın
        marginTop: SPACING.xs
    }
});

export default ShopScreen;