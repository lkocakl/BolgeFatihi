import React, { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity,
    ActivityIndicator, ScrollView, RefreshControl,
    KeyboardAvoidingView, Platform, Image, Alert as StandardAlert // İsim çakışmasın diye değiştirdik
} from 'react-native';
import { doc, setDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail, signOut, deleteUser } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { db, auth, storage } from './firebaseConfig';
import { useAuth } from './AuthContext';
import { useAlert } from './AlertContext'; // [YENİ] Hook'u çağırdık
import { COLORS, SPACING, FONT_SIZES, SHADOWS } from './constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Badge from './components/Badge';

const getBlobFromUri = async (uri: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        resolve(xhr.response);
      };
      xhr.onerror = function (e) {
        console.log(e);
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
    const { showAlert } = useAlert(); // [YENİ] Alert fonksiyonunu aldık
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
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setStats({
                    totalDistance: data.totalDistance || 0,
                    totalRoutes: data.totalRoutes || 0,
                    totalScore: data.totalScore || 0
                });
            }
        });
        return unsubscribe;
    };

    useEffect(() => {
        const unsubscribe = fetchUserStats();
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user]);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
        }, 1000);
    }, []);

    const handleImageSelection = async () => {
        // Seçim menüsü için standart alert kullanılabilir veya custom modal yapılabilir.
        // Şimdilik basitlik için standart alert button yapısını koruyoruz.
        StandardAlert.alert(
            "Profil Fotoğrafı",
            "Fotoğraf yüklemek için bir yöntem seçin",
            [
                { text: "Kamera", onPress: pickFromCamera },
                { text: "Galeri", onPress: pickFromGallery },
                { text: "İptal", style: "cancel" }
            ]
        );
    };

    const pickFromGallery = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showAlert('İzin Gerekli', 'Galeriye erişim izni vermelisiniz.', 'warning');
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });
        if (!result.canceled) {
            handleImageUpload(result.assets[0].uri);
        }
    };

    const pickFromCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            showAlert('İzin Gerekli', 'Kameraya erişim izni vermelisiniz.', 'warning');
            return;
        }
        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });
        if (!result.canceled) {
            handleImageUpload(result.assets[0].uri);
        }
    };

    const handleImageUpload = async (uri: string) => {
        if (!user) return;
        setUploading(true);
        try {
            const blob = await getBlobFromUri(uri);
            const fileExtension = uri.split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpg';
            const mimeType = fileExtension === 'png' ? 'image/png' : 'image/jpeg';
            const filename = `${Date.now()}.${fileExtension}`;
            
            const storageRef = ref(storage, `profile_images/${user.uid}/${filename}`);

            await uploadBytes(storageRef, blob, { contentType: mimeType });
            const downloadURL = await getDownloadURL(storageRef);

            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, { profileImage: downloadURL }, { merge: true });

            setProfileImage(downloadURL);
            
            // @ts-ignore
            blob.close && blob.close();

            // [DEĞİŞTİRİLDİ] Custom Alert kullanımı
            showAlert("Başarılı", "Profil fotoğrafı güncellendi!", 'success');
        } catch (error: any) {
            if (error instanceof FirebaseError) {
                showAlert("Hata", `Fotoğraf yüklenemedi: ${error.code}`, 'error');
            } else {
                console.error("Upload error:", error);
                showAlert("Hata", "Fotoğraf yüklenirken bir sorun oluştu.", 'error');
            }
        } finally {
            setUploading(false);
        }
    };

    const badges = [
        { id: 'first_step', name: 'İlk Adım', description: 'İlk rotanı kaydet', icon: 'shoe-print', isUnlocked: stats.totalRoutes >= 1 },
        { id: 'explorer', name: 'Kaşif', description: '5 fetih yap', icon: 'compass', isUnlocked: stats.totalRoutes >= 5 },
        { id: 'marathoner', name: 'Maratoncu', description: 'Toplam 42km koş', icon: 'run', isUnlocked: stats.totalDistance >= 42 },
        { id: 'conqueror', name: 'Fatih', description: '1000 puan topla', icon: 'crown', isUnlocked: stats.totalScore >= 1000 }
    ];

    const handleUpdateProfile = async () => {
        if (!user) return;
        if (username.trim().length < 3) {
            showAlert("Hata", "Kullanıcı adı en az 3 karakter olmalıdır.", 'warning');
            return;
        }
        setLoading(true);
        try {
            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, {
                username: username.trim(),
                email: user.email,
                updatedAt: new Date()
            }, { merge: true });
            
            // [DEĞİŞTİRİLDİ]
            showAlert("Başarılı", "Profil güncellendi!", 'success');
        } catch (error) {
            console.error("Update error:", error);
            showAlert("Hata", "Profil güncellenemedi.", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (user?.email) {
            try {
                await sendPasswordResetEmail(auth, user.email);
                // [DEĞİŞTİRİLDİ]
                showAlert("E-posta Gönderildi", "Şifre sıfırlama bağlantısı gönderildi.", 'success');
            } catch (error: any) {
                showAlert("Hata", error.message, 'error');
            }
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const handleDeleteAccount = () => {
        // [ÖNEMLİ] Silme onayı gibi kritik kararlar için standart Alert'ün butonlarını kullanmak
        // daha güvenlidir. CustomAlert'ü "Evet/Hayır" butonlu hale getirmediğimiz sürece
        // burası standart kalmalı.
        StandardAlert.alert(
            "Hesabı Sil",
            "Hesabınızı ve tüm verilerinizi kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
            [
                { text: "Vazgeç", style: "cancel" },
                {
                    text: "Hesabımı Sil",
                    style: "destructive",
                    onPress: async () => {
                        if (!user) return;
                        setLoading(true);
                        try {
                            await deleteDoc(doc(db, "users", user.uid));
                            await deleteUser(user);
                        } catch (error: any) {
                            console.error("Delete account error:", error);
                            if (error.code === 'auth/requires-recent-login') {
                                showAlert("Güvenlik Uyarısı", "Hesabınızı silmek için lütfen çıkış yapıp tekrar giriş yapın.", 'warning');
                            } else {
                                showAlert("Hata", "Hesap silinemedi: " + error.message, 'error');
                            }
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    if (!user) return <View style={styles.centerContainer}><Text style={styles.infoText}>Giriş yapmalısınız.</Text></View>;

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
            <LinearGradient colors={[COLORS.surface, '#F0F4C3']} style={StyleSheet.absoluteFill} />
            <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
                <View style={styles.headerContainer}>
                    <View style={styles.avatarContainer}>
                        <TouchableOpacity onPress={handleImageSelection} disabled={uploading}>
                            {profileImage ? (
                                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                            ) : (
                                <LinearGradient colors={COLORS.primaryGradient as [string, string]} style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>{username ? username.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}</Text>
                                </LinearGradient>
                            )}
                            {uploading && <View style={styles.uploadingOverlay}><ActivityIndicator color="white" /></View>}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.editAvatarButton} onPress={handleImageSelection}>
                            <MaterialCommunityIcons name="camera" size={18} color="white" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.userInfoContainer}>
                        <Text style={styles.userNameText}>{username || "İsimsiz Fatih"}</Text>
                        <Text style={styles.emailText}>{user.email}</Text>
                    </View>
                </View>
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <MaterialCommunityIcons name="map-marker-distance" size={28} color={COLORS.primary} />
                        <Text style={styles.statValue}>{stats.totalDistance.toFixed(1)}</Text>
                        <Text style={styles.statLabel}>Toplam KM</Text>
                    </View>
                    <View style={styles.statCard}>
                        <MaterialCommunityIcons name="flag-variant" size={28} color={COLORS.secondaryDark} />
                        <Text style={styles.statValue}>{stats.totalRoutes}</Text>
                        <Text style={styles.statLabel}>Fetihler</Text>
                    </View>
                    <View style={styles.statCard}>
                        <MaterialCommunityIcons name="star" size={28} color="#FFD700" />
                        <Text style={styles.statValue}>{stats.totalScore}</Text>
                        <Text style={styles.statLabel}>Puan</Text>
                    </View>
                </View>
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Başarımlar</Text>
                    {badges.map(badge => (
                        <Badge key={badge.id} {...badge} />
                    ))}
                </View>
                <View style={{ marginHorizontal: SPACING.l, marginBottom: SPACING.m }}>
                    <TouchableOpacity 
                        style={styles.historyButton} 
                        onPress={() => (navigation as any).navigate('RouteHistory')}
                    >
                        <LinearGradient
                            colors={['#4FC3F7', '#29B6F6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.historyGradient}
                        >
                            <MaterialCommunityIcons name="history" size={24} color="white" />
                            <Text style={styles.historyButtonText}>Geçmiş Koşularım</Text>
                            <MaterialCommunityIcons name="chevron-right" size={24} color="white" style={{ marginLeft: 'auto' }} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
                <View style={styles.formSection}>
                    <Text style={styles.sectionTitle}>Profil Ayarları</Text>
                    <View style={styles.inputContainer}>
                        <MaterialCommunityIcons name="account" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                        <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Kullanıcı Adı" placeholderTextColor={COLORS.textSecondary} />
                    </View>
                    <TouchableOpacity style={styles.updateButton} onPress={handleUpdateProfile} disabled={loading}>
                        <LinearGradient colors={COLORS.primaryGradient as [string, string]} style={styles.gradientButton}>
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Güncelle</Text>}
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.resetButton} onPress={handlePasswordReset}>
                        <MaterialCommunityIcons name="lock-reset" size={20} color={COLORS.textSecondary} />
                        <Text style={styles.resetButtonText}>Şifre Sıfırla</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <MaterialCommunityIcons name="logout" size={20} color={COLORS.error} style={{marginRight: 8}} />
                        <Text style={styles.logoutText}>Çıkış Yap</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
                        <MaterialCommunityIcons name="delete-forever" size={20} color="#D32F2F" />
                        <Text style={styles.deleteAccountText}>Hesabımı Sil</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.versionText}>v1.0.0 • Bölge Fatihi</Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingBottom: SPACING.xl },
    headerContainer: {
        alignItems: 'center', 
        paddingTop: SPACING.xl + 30, 
        paddingBottom: SPACING.l,
        backgroundColor: COLORS.surface,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        ...SHADOWS.small,
        marginBottom: SPACING.m,
    },
    avatarContainer: { 
        position: 'relative', 
        marginBottom: SPACING.s,
        ...SHADOWS.medium 
    },
    avatarPlaceholder: { 
        width: 110, height: 110, borderRadius: 55, 
        justifyContent: 'center', alignItems: 'center', 
        borderWidth: 4, borderColor: 'white' 
    },
    avatarImage: { 
        width: 110, height: 110, borderRadius: 55, 
        borderWidth: 4, borderColor: 'white' 
    },
    uploadingOverlay: { 
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
        borderRadius: 55, backgroundColor: 'rgba(0,0,0,0.4)', 
        justifyContent: 'center', alignItems: 'center' 
    },
    avatarText: { fontSize: 44, color: 'white', fontWeight: 'bold' },
    editAvatarButton: { 
        position: 'absolute', bottom: 0, right: 0, 
        backgroundColor: COLORS.secondaryDark, 
        padding: 8, borderRadius: 20, 
        borderWidth: 3, borderColor: 'white' 
    },
    userInfoContainer: { alignItems: 'center' },
    userNameText: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.primaryDark },
    emailText: { fontSize: FONT_SIZES.m, color: COLORS.textSecondary, marginTop: 2 },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.l, marginBottom: SPACING.xl },
    statCard: { 
        flex: 1, backgroundColor: COLORS.surface, 
        padding: SPACING.m, borderRadius: 16, 
        alignItems: 'center', marginHorizontal: SPACING.xs, 
        ...SHADOWS.small 
    },
    statValue: { fontSize: FONT_SIZES.l, fontWeight: 'bold', color: COLORS.text, marginVertical: 4 },
    statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
    sectionContainer: { marginHorizontal: SPACING.l, marginBottom: SPACING.l },
    formSection: { 
        backgroundColor: COLORS.surface, marginHorizontal: SPACING.l, 
        borderRadius: 20, padding: SPACING.l, ...SHADOWS.small, 
        marginBottom: SPACING.l 
    },
    sectionTitle: { fontSize: FONT_SIZES.l, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.m },
    inputContainer: { 
        flexDirection: 'row', alignItems: 'center', 
        backgroundColor: COLORS.background, borderRadius: 12, 
        paddingHorizontal: SPACING.m, marginBottom: SPACING.m, 
        height: 50 
    },
    inputIcon: { marginRight: SPACING.s },
    input: { flex: 1, fontSize: FONT_SIZES.m, color: COLORS.text },
    updateButton: { borderRadius: 12, overflow: 'hidden', marginBottom: SPACING.m },
    gradientButton: { paddingVertical: 15, alignItems: 'center' },
    buttonText: { color: 'white', fontSize: FONT_SIZES.m, fontWeight: 'bold' },
    resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: SPACING.s },
    resetButtonText: { color: COLORS.textSecondary, marginLeft: SPACING.s, fontSize: FONT_SIZES.s },
    actionButtonsContainer: { marginHorizontal: SPACING.l, marginBottom: SPACING.l },
    logoutButton: { 
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        padding: SPACING.m, borderWidth: 1, borderColor: COLORS.error, 
        borderRadius: 12, marginBottom: SPACING.m, backgroundColor: 'white' 
    },
    logoutText: { color: COLORS.error, fontWeight: 'bold', fontSize: FONT_SIZES.m },
    deleteAccountButton: { 
        padding: SPACING.s, 
        alignItems: 'center', 
        flexDirection: 'row', 
        justifyContent: 'center',
        opacity: 0.7
    },
    deleteAccountText: { 
        color: '#D32F2F', 
        fontSize: FONT_SIZES.s, 
        marginLeft: 5,
        fontWeight: '600' 
    },
    versionText: { textAlign: 'center', color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, opacity: 0.5, marginBottom: SPACING.l },
    infoText: { fontSize: FONT_SIZES.m, color: COLORS.textSecondary },
    historyButton: {
        borderRadius: 16,
        overflow: 'hidden',
        ...SHADOWS.small,
    },
    historyGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.m,
    },
    historyButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: SPACING.m
    }

});

export default ProfileScreen;