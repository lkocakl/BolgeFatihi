import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity,
    ActivityIndicator, ScrollView, RefreshControl,
    KeyboardAvoidingView, Platform
} from 'react-native';
import { Image } from 'expo-image'; // [YENİ] Performanslı resimler
import { doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail, signOut, deleteUser } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location'; // [YENİ] Konum için
import { db, auth, storage } from './firebaseConfig';
import { useAuth } from './AuthContext';
import { useAlert } from './AlertContext';
import { SPACING, FONT_SIZES, SHADOWS } from './constants/theme';
import { useTheme } from './ThemeContext';
import { getLeagueInfo } from './utils';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getBlobFromUri = async (uri: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
            resolve(xhr.response);
        };
        xhr.onerror = function (e) {
            reject(new TypeError("Network request failed"));
        };
        xhr.responseType = "blob";
        xhr.open("GET", uri, true);
        xhr.send(null);
    });
};

const ProfileScreen = () => {
    const navigation = useNavigation();
    const { user, userProfile } = useAuth();
    const { showAlert } = useAlert();
    const { colors, isDark, toggleTheme } = useTheme();
    const { t, i18n } = useTranslation();

    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [stats, setStats] = useState({
        totalDistance: 0,
        totalRoutes: 0,
        totalScore: 0
    });
    const [refreshing, setRefreshing] = useState(false);

    const league = getLeagueInfo(stats.totalScore);

    const changeLanguage = async () => {
        const currentLang = i18n.language;
        const nextLang = currentLang === 'tr' ? 'en' : 'tr';
        await i18n.changeLanguage(nextLang);
        await AsyncStorage.setItem('user-language', nextLang);
    };

    useEffect(() => {
        if (userProfile?.username) {
            setUsername(userProfile.username);
        }
        if (userProfile?.profileImage) {
            setProfileImage(userProfile.profileImage);
        }
    }, [userProfile]);

    const fetchUserStats = () => {
        if (!user) return;
        const userDocRef = doc(db, "users", user.uid);
        return onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setStats({
                    totalDistance: data.totalDistance || 0,
                    totalRoutes: data.totalRoutes || 0,
                    totalScore: data.totalScore || 0
                });
            }
        });
    };

    useEffect(() => {
        const unsubscribe = fetchUserStats();
        return () => { if (unsubscribe) unsubscribe(); };
    }, [user]);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    const handleSetPrivacyZone = async () => {
        showAlert(
            t('profile.privacyZone'),
            t('profile.privacyMsg'),
            "info",
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: "Ayarlar", onPress: async () => {
                        try {
                            const { status } = await Location.requestForegroundPermissionsAsync();
                            if (status !== 'granted') {
                                showAlert(t('common.error'), t('map.locationPermMsg'), 'error');
                                return;
                            }

                            const loc = await Location.getCurrentPositionAsync({});
                            const userRef = doc(db, "users", user!.uid);

                            await setDoc(userRef, {
                                privacyZone: {
                                    latitude: loc.coords.latitude,
                                    longitude: loc.coords.longitude,
                                    radius: 200, // 200 metre yarıçap
                                    isEnabled: true
                                }
                            }, { merge: true });

                            showAlert(t('common.success'), "Ev konumu ayarlandı.", 'success');
                        } catch (e) {
                            showAlert(t('common.error'), "Konum alınamadı.", 'error');
                        }
                    }, style: 'default'
                },
                {
                    text: "Kapat", onPress: async () => {
                        const userRef = doc(db, "users", user!.uid);
                        await setDoc(userRef, { privacyZone: null }, { merge: true });
                        showAlert(t('common.info'), "Gizlilik koruması kaldırıldı.", 'warning');
                    }, style: 'destructive'
                }
            ]
        );
    };

    const handleImageSelection = async () => {
        showAlert(
            t('profile.changePhoto'),
            t('profile.photoMethod'),
            "info",
            [
                { text: t('profile.camera'), onPress: pickFromCamera, style: 'default' },
                { text: t('profile.gallery'), onPress: pickFromGallery, style: 'default' },
                { text: t('common.cancel'), style: 'cancel' }
            ]
        );
    };

    const pickFromGallery = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return;
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });
        if (!result.canceled) handleImageUpload(result.assets[0].uri);
    };

    const pickFromCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return;
        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });
        if (!result.canceled) handleImageUpload(result.assets[0].uri);
    };

    const handleImageUpload = async (uri: string) => {
        if (!user) return;
        setUploading(true);
        try {
            const blob = await getBlobFromUri(uri);
            const filename = `${Date.now()}.jpg`;
            const storageRef = ref(storage, `profile_images/${user.uid}/${filename}`);
            await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
            const downloadURL = await getDownloadURL(storageRef);
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, { profileImage: downloadURL }, { merge: true });
            setProfileImage(downloadURL);
            // @ts-ignore
            blob.close && blob.close();
            showAlert(t('common.success'), "Fotoğraf güncellendi!", 'success');
        } catch (error) {
            showAlert(t('common.error'), "Yükleme hatası.", 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateProfile = async () => {
        if (!user || username.trim().length < 3) return;
        setLoading(true);
        try {
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, {
                username: username.trim(),
                email: user.email,
                updatedAt: new Date()
            }, { merge: true });
            showAlert(t('common.success'), "Profil güncellendi!", 'success');
        } catch (error) {
            showAlert(t('common.error'), "Güncelleme başarısız.", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (user?.email) {
            try {
                await sendPasswordResetEmail(auth, user.email);
                showAlert(t('common.success'), "E-posta gönderildi.", 'success');
            } catch (error: any) {
                showAlert(t('common.error'), error.message, 'error');
            }
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
    };

    const handleDeleteAccount = () => {
        showAlert(
            t('profile.deleteAccount'),
            t('profile.deleteConfirm'),
            "error",
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        if (!user) return;
                        setLoading(true);
                        try {
                            await deleteDoc(doc(db, "users", user.uid));
                            await deleteUser(user);
                        } catch (error) {
                            showAlert(t('common.error'), "Hata oluştu.", 'error');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    if (!user) return <View style={[styles.centerContainer, { backgroundColor: colors.background }]}><Text style={[styles.infoText, { color: colors.textSecondary }]}>{t('auth.guestMessage')}</Text></View>;

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient colors={isDark ? [colors.surface, colors.background] : [colors.surface, '#F0F4C3']} style={StyleSheet.absoluteFill} />
            <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
                <View style={[styles.headerContainer, { backgroundColor: colors.surface }]}>

                    {/* Dil Değiştirme Butonu */}
                    <TouchableOpacity
                        style={styles.langToggle}
                        onPress={changeLanguage}
                    >
                        <Text style={[styles.langText, { color: colors.primary }]}>
                            {i18n.language === 'tr' ? '🇹🇷 TR' : '🇺🇸 EN'}
                        </Text>
                    </TouchableOpacity>

                    {/* Tema Değiştirme Butonu */}
                    <TouchableOpacity
                        style={styles.themeToggle}
                        onPress={toggleTheme}
                    >
                        <MaterialCommunityIcons
                            name={isDark ? "weather-sunny" : "weather-night"}
                            size={24}
                            color={colors.text}
                        />
                    </TouchableOpacity>

                    <View style={styles.avatarContainer}>
                        <TouchableOpacity onPress={handleImageSelection} disabled={uploading}>
                            {/* Expo Image kullanımı */}
                            {profileImage ? (
                                <Image
                                    source={{ uri: profileImage }}
                                    style={[styles.avatarImage, { borderColor: colors.surface }]}
                                    contentFit="cover"
                                    transition={500}
                                />
                            ) : (
                                <LinearGradient colors={colors.primaryGradient as [string, string]} style={[styles.avatarPlaceholder, { borderColor: colors.surface }]}>
                                    <Text style={styles.avatarText}>{username ? username.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}</Text>
                                </LinearGradient>
                            )}
                            {uploading && <View style={styles.uploadingOverlay}><ActivityIndicator color="white" /></View>}
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.editAvatarButton, { backgroundColor: colors.secondaryDark, borderColor: colors.surface }]} onPress={handleImageSelection}>
                            <MaterialCommunityIcons name="camera" size={18} color="white" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.userInfoContainer}>
                        <Text style={[styles.userNameText, { color: colors.primaryDark }]}>{username || "İsimsiz Fatih"}</Text>
                        {/* Lig Bilgisi Çevirisi */}
                        <View style={[styles.leagueBadge, { backgroundColor: league.color + '30', borderColor: league.color }]}>
                            <MaterialCommunityIcons name={league.icon as any} size={16} color={league.color} style={{ marginRight: 4 }} />
                            <Text style={[styles.leagueText, { color: isDark ? 'white' : 'black' }]}>
                                {t(league.name)}
                            </Text>
                        </View>
                        <Text style={[styles.emailText, { color: colors.textSecondary }]}>{user.email}</Text>
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                        <MaterialCommunityIcons name="map-marker-distance" size={28} color={colors.primary} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalDistance.toFixed(1)}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('profile.totalKm')}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                        <MaterialCommunityIcons name="flag-variant" size={28} color={colors.secondaryDark} />
                        <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalRoutes}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('profile.conquests')}</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
                        <MaterialCommunityIcons name="star" size={28} color="#FFD700" />
                        <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalScore}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('profile.points')}</Text>
                    </View>
                </View>

                <View style={styles.buttonsContainer}>
                    <TouchableOpacity style={styles.menuButton} onPress={() => (navigation as any).navigate('RouteHistory')}>
                        <LinearGradient colors={colors.primaryGradient as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.menuGradient}>
                            <MaterialCommunityIcons name="history" size={24} color="white" />
                            <Text style={styles.menuButtonText}>{t('profile.routeHistory')}</Text>
                            <MaterialCommunityIcons name="chevron-right" size={24} color="white" style={{ marginLeft: 'auto' }} />
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.menuButton} onPress={() => (navigation as any).navigate('Achievements')}>
                        <LinearGradient colors={colors.primaryGradient as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.menuGradient}>
                            <MaterialCommunityIcons name="trophy-award" size={24} color="white" />
                            <Text style={styles.menuButtonText}>{t('profile.achievements')}</Text>
                            <MaterialCommunityIcons name="chevron-right" size={24} color="white" style={{ marginLeft: 'auto' }} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                <View style={[styles.formSection, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profile.settings')}</Text>
                    <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
                        <MaterialCommunityIcons name="account" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            value={username}
                            onChangeText={setUsername}
                            placeholder={t('profile.username')}
                            placeholderTextColor={colors.textSecondary}
                        />
                    </View>

                    {/* Gizlilik Alanı Butonu */}
                    <TouchableOpacity style={[styles.privacyButton, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={handleSetPrivacyZone}>
                        <MaterialCommunityIcons name="home-map-marker" size={20} color={colors.primary} style={styles.inputIcon} />
                        <Text style={[styles.privacyButtonText, { color: colors.text }]}>{t('profile.privacyZone')}</Text>
                        <MaterialCommunityIcons name={userProfile?.privacyZone?.isEnabled ? "check-circle" : "alert-circle-outline"} size={20} color={userProfile?.privacyZone?.isEnabled ? colors.success : colors.textSecondary} style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.updateButton} onPress={handleUpdateProfile} disabled={loading}>
                        <LinearGradient colors={colors.primaryGradient as [string, string]} style={styles.gradientButton}>
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>{t('profile.update')}</Text>}
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.resetButton} onPress={handlePasswordReset}>
                        <MaterialCommunityIcons name="lock-reset" size={20} color={colors.textSecondary} />
                        <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>{t('profile.resetPass')}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.surface, borderColor: colors.error }]} onPress={handleLogout}>
                        <MaterialCommunityIcons name="logout" size={20} color={colors.error} style={{ marginRight: 8 }} />
                        <Text style={[styles.logoutText, { color: colors.error }]}>{t('profile.logout')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
                        <MaterialCommunityIcons name="delete-forever" size={20} color="#D32F2F" />
                        <Text style={styles.deleteAccountText}>{t('profile.deleteAccount')}</Text>
                    </TouchableOpacity>
                </View>
                <Text style={[styles.versionText, { color: colors.textSecondary }]}>v1.3.0 • Bölge Fatihi</Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingBottom: SPACING.xl },
    headerContainer: {
        alignItems: 'center', paddingTop: SPACING.xl + 30, paddingBottom: SPACING.l,
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        ...SHADOWS.small, marginBottom: SPACING.m, position: 'relative'
    },
    themeToggle: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
    langToggle: { position: 'absolute', top: 50, left: 20, zIndex: 10, padding: 8, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 8 },
    langText: { fontWeight: 'bold' },
    avatarContainer: { position: 'relative', marginBottom: SPACING.s, ...SHADOWS.medium },
    avatarPlaceholder: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', borderWidth: 4 },
    avatarImage: { width: 110, height: 110, borderRadius: 55, borderWidth: 4 },
    uploadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 55, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 44, color: 'white', fontWeight: 'bold' },
    editAvatarButton: { position: 'absolute', bottom: 0, right: 0, padding: 8, borderRadius: 20, borderWidth: 3 },
    userInfoContainer: { alignItems: 'center' },
    userNameText: { fontSize: FONT_SIZES.xl, fontWeight: '800' },
    emailText: { fontSize: FONT_SIZES.m, marginTop: 2 },
    leagueBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, marginVertical: 4 },
    leagueText: { fontSize: 12, fontWeight: 'bold' },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.l, marginBottom: SPACING.xl },
    statCard: { flex: 1, padding: SPACING.m, borderRadius: 16, alignItems: 'center', marginHorizontal: SPACING.xs, ...SHADOWS.small },
    statValue: { fontSize: FONT_SIZES.l, fontWeight: 'bold', marginVertical: 4 },
    statLabel: { fontSize: FONT_SIZES.xs },
    buttonsContainer: { marginHorizontal: SPACING.l, marginBottom: SPACING.l, gap: SPACING.m },
    menuButton: { borderRadius: 16, overflow: 'hidden', ...SHADOWS.small },
    menuGradient: { flexDirection: 'row', alignItems: 'center', padding: SPACING.m },
    menuButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: SPACING.m },
    formSection: { marginHorizontal: SPACING.l, borderRadius: 20, padding: SPACING.l, ...SHADOWS.small, marginBottom: SPACING.l },
    sectionTitle: { fontSize: FONT_SIZES.l, fontWeight: '700', marginBottom: SPACING.m },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: SPACING.m, marginBottom: SPACING.m, height: 50 },
    privacyButton: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: SPACING.m, marginBottom: SPACING.m, height: 50, borderWidth: 1 },
    privacyButtonText: { flex: 1, fontSize: FONT_SIZES.m, marginLeft: SPACING.s },
    inputIcon: { marginRight: SPACING.s },
    input: { flex: 1, fontSize: FONT_SIZES.m },
    updateButton: { borderRadius: 12, overflow: 'hidden', marginBottom: SPACING.m },
    gradientButton: { paddingVertical: 15, alignItems: 'center' },
    buttonText: { color: 'white', fontSize: FONT_SIZES.m, fontWeight: 'bold' },
    resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: SPACING.s },
    resetButtonText: { marginLeft: SPACING.s, fontSize: FONT_SIZES.s },
    actionButtonsContainer: { marginHorizontal: SPACING.l, marginBottom: SPACING.l },
    logoutButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: SPACING.m, borderWidth: 1, borderRadius: 12, marginBottom: SPACING.m },
    logoutText: { fontWeight: 'bold', fontSize: FONT_SIZES.m },
    deleteAccountButton: { padding: SPACING.s, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', opacity: 0.7 },
    deleteAccountText: { color: '#D32F2F', fontSize: FONT_SIZES.s, marginLeft: 5, fontWeight: '600' },
    versionText: { textAlign: 'center', fontSize: FONT_SIZES.xs, opacity: 0.5, marginBottom: SPACING.l },
    infoText: { fontSize: FONT_SIZES.m },
});

export default ProfileScreen;