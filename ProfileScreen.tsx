import React, { useState, useEffect } from 'react';
import {
    StyleSheet, View, Text, TextInput, TouchableOpacity,
    Alert, ActivityIndicator, ScrollView, RefreshControl,
    KeyboardAvoidingView, Platform, Image
} from 'react-native';
import {
    doc, setDoc, onSnapshot, deleteDoc
} from 'firebase/firestore';
import { sendPasswordResetEmail, signOut, deleteUser } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { db, auth, storage } from './firebaseConfig';
import { useAuth } from './AuthContext';
import { COLORS, SPACING, FONT_SIZES, SHADOWS } from './constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Badge from './components/Badge';

const ProfileScreen = () => {
    const { user, userProfile } = useAuth();
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

        // OPTİMİZASYON: Doğrudan user dokümanındaki istatistikleri dinliyoruz
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
        Alert.alert(
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
            Alert.alert('İzin Gerekli', 'Galeriye erişim izni vermelisiniz.');
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
            Alert.alert('İzin Gerekli', 'Kameraya erişim izni vermelisiniz.');
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
            const response = await fetch(uri);
            const blob = await response.blob();
            const mimeType = blob.type || 'image/jpeg';
            const fileExtension = mimeType.split('/').pop() === 'png' ? 'png' : 'jpg';
            const filename = `${Date.now()}.${fileExtension}`;
            const storageRef = ref(storage, `profile_images/${user.uid}/${filename}`);

            await uploadBytes(storageRef, blob, { contentType: mimeType });
            const downloadURL = await getDownloadURL(storageRef);

            const userRef = doc(db, "users", user.uid);
            await setDoc(userRef, { profileImage: downloadURL }, { merge: true });

            setProfileImage(downloadURL);
            Alert.alert("Başarılı", "Profil fotoğrafı güncellendi!");
        } catch (error: any) {
            console.error("Upload error:", error);
            Alert.alert("Hata", "Fotoğraf yüklenirken bir sorun oluştu.");
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
            Alert.alert("Hata", "Kullanıcı adı en az 3 karakter olmalıdır.");
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
            Alert.alert("Başarılı", "Profil güncellendi!");
        } catch (error) {
            console.error("Update error:", error);
            Alert.alert("Hata", "Profil güncellenemedi.");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (user?.email) {
            try {
                await sendPasswordResetEmail(auth, user.email);
                Alert.alert("E-posta Gönderildi", "Şifre sıfırlama bağlantısı gönderildi.");
            } catch (error: any) {
                Alert.alert("Hata", error.message);
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

    // --- HESAP SİLME FONKSİYONU (YENİ) ---
    const handleDeleteAccount = () => {
        Alert.alert(
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
                            // 1. Firestore'daki kullanıcı verisini sil
                            await deleteDoc(doc(db, "users", user.uid));
                            
                            // 2. Firebase Auth kullanıcısını sil
                            await deleteUser(user);
                            
                            // Not: AuthContext otomatik olarak çıkışa yönlendirecektir.
                        } catch (error: any) {
                            console.error("Delete account error:", error);
                            // Güvenlik gereği, kullanıcı uzun süredir giriş yapmadıysa tekrar giriş yapmasını isteyebilir
                            if (error.code === 'auth/requires-recent-login') {
                                Alert.alert("Güvenlik Uyarısı", "Hesabınızı silmek için lütfen çıkış yapıp tekrar giriş yapın.");
                            } else {
                                Alert.alert("Hata", "Hesap silinemedi: " + error.message);
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
            <LinearGradient colors={[COLORS.surface, '#E8F5E9']} style={StyleSheet.absoluteFill} />
            <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
                <View style={styles.header}>
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
                            <MaterialCommunityIcons name="camera" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.emailText}>{user.email}</Text>
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

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Çıkış Yap</Text>
                </TouchableOpacity>

                {/* HESAP SİLME BUTONU (YENİ) */}
                <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
                    <MaterialCommunityIcons name="delete-forever" size={20} color="#D32F2F" />
                    <Text style={styles.deleteAccountText}>Hesabımı Sil</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>v1.0.0 • Bölge Fatihi</Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingBottom: SPACING.xl },
    header: { alignItems: 'center', paddingTop: SPACING.xxl + 20, paddingBottom: SPACING.xl },
    avatarContainer: { position: 'relative', marginBottom: SPACING.m },
    avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
    avatarImage: { width: 100, height: 100, borderRadius: 50, ...SHADOWS.medium },
    uploadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 50, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 40, color: 'white', fontWeight: 'bold' },
    editAvatarButton: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.secondaryDark, padding: 8, borderRadius: 20, borderWidth: 3, borderColor: COLORS.surface },
    emailText: { fontSize: FONT_SIZES.m, color: COLORS.textSecondary },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.l, marginBottom: SPACING.xl },
    statCard: { flex: 1, backgroundColor: COLORS.surface, padding: SPACING.m, borderRadius: 16, alignItems: 'center', marginHorizontal: SPACING.xs, ...SHADOWS.small },
    statValue: { fontSize: FONT_SIZES.l, fontWeight: 'bold', color: COLORS.text, marginVertical: 4 },
    statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
    sectionContainer: { marginHorizontal: SPACING.l, marginBottom: SPACING.l },
    formSection: { backgroundColor: COLORS.surface, marginHorizontal: SPACING.l, borderRadius: 20, padding: SPACING.l, ...SHADOWS.small, marginBottom: SPACING.l },
    sectionTitle: { fontSize: FONT_SIZES.l, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.m },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: SPACING.m, marginBottom: SPACING.m, height: 50 },
    inputIcon: { marginRight: SPACING.s },
    input: { flex: 1, fontSize: FONT_SIZES.m, color: COLORS.text },
    updateButton: { borderRadius: 12, overflow: 'hidden', marginBottom: SPACING.m },
    gradientButton: { paddingVertical: 15, alignItems: 'center' },
    buttonText: { color: 'white', fontSize: FONT_SIZES.m, fontWeight: 'bold' },
    resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: SPACING.s },
    resetButtonText: { color: COLORS.textSecondary, marginLeft: SPACING.s, fontSize: FONT_SIZES.s },
    logoutButton: { marginHorizontal: SPACING.l, padding: SPACING.m, alignItems: 'center', borderWidth: 1, borderColor: COLORS.error, borderRadius: 12, marginBottom: SPACING.m },
    logoutText: { color: COLORS.error, fontWeight: 'bold', fontSize: FONT_SIZES.m },
    
    // YENİ STİLLER
    deleteAccountButton: { 
        marginHorizontal: SPACING.l, 
        padding: SPACING.s, 
        alignItems: 'center', 
        flexDirection: 'row', 
        justifyContent: 'center',
        marginBottom: SPACING.l,
        opacity: 0.7
    },
    deleteAccountText: { 
        color: '#D32F2F', 
        fontSize: FONT_SIZES.s, 
        marginLeft: 5,
        fontWeight: '600' 
    },

    versionText: { textAlign: 'center', color: COLORS.textSecondary, fontSize: FONT_SIZES.xs, opacity: 0.5 },
    infoText: { fontSize: FONT_SIZES.m, color: COLORS.textSecondary }
});

export default ProfileScreen;