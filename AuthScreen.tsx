import React, { useState } from 'react';
import { 
    View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, 
    ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app } from './firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking'; // [YENİ] Link açmak için
import { COLORS, SPACING, FONT_SIZES, SHADOWS } from './constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const auth = getAuth(app);
const db = getFirestore(app);

// [YENİ] Yasal metin linkleri (İleride kendi sitenle değiştir)
const PRIVACY_POLICY_URL = 'https://gist.githubusercontent.com/lkocakl/b80bf21c5e476093b8074ebe4c9d0c8c/raw/25d63ebf94bef08265702fc5af5e061f871805b2/privacy-policy.md'; 
const TERMS_OF_USE_URL = 'https://gist.githubusercontent.com/lkocakl/db58de89638b8975bbaf892b166a327f/raw/77b73a903d9b8817b1d92afd27915d696d168fd9/terms-of-use.md';

const AuthScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation();

    const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // [YENİ] Link açma fonksiyonu
    const handleOpenLink = async (url: string) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Hata", "Bu link açılamıyor: " + url);
            }
        } catch (error) {
            console.error("Link hatası:", error);
        }
    };

    const handleAuthentication = async () => {
        if (!email || !password) {
            Alert.alert("Hata", "Lütfen email ve şifre girin.");
            return;
        }

        if (!isValidEmail(email)) {
            Alert.alert("Hata", "Lütfen geçerli bir email adresi girin.");
            return;
        }

        if (password.length < 6) {
            Alert.alert("Hata", "Şifre en az 6 karakter olmalıdır.");
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                const userDocRef = doc(db, "users", user.uid);
                await setDoc(userDocRef, {
                    email: user.email,
                    username: user.email?.split('@')[0] || `kullanici_${user.uid.substring(0, 5)}`,
                    createdAt: serverTimestamp(),
                    // [YENİ] Başlangıç istatistiklerini sıfırla (Batch hatasını önlemek için)
                    totalDistance: 0,
                    totalRoutes: 0,
                    totalScore: 0
                });
            }

            (navigation as any).goBack();

        } catch (error: any) {
            let errorMessage = error.message.replace("Firebase: ", "").replace("Firebase Auth: ", "");
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                errorMessage = "Kullanıcı bulunamadı veya şifre yanlış.";
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = "Şifre yanlış.";
            } else if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Bu email adresi zaten kullanılıyor.";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "Şifre çok zayıf. Daha güçlü bir şifre seçin.";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Geçersiz email adresi.";
            }
            Alert.alert("Hata", errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <LinearGradient
                colors={[COLORS.surface, '#E8F5E9']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.content}>
                <View style={styles.headerContainer}>
                    <MaterialCommunityIcons name="map-marker-radius" size={64} color={COLORS.primary} />
                    <Text style={styles.appTitle}>Bölge Fatihi</Text>
                    <Text style={styles.subtitle}>Şehri Fethetmeye Hazır Mısın?</Text>
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>{isLogin ? 'Giriş Yap' : 'Hesap Oluştur'}</Text>

                    <View style={styles.inputContainer}>
                        <MaterialCommunityIcons name="email-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email Adresi"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            placeholderTextColor={COLORS.textSecondary}
                            editable={!loading}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <MaterialCommunityIcons name="lock-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Şifre"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            placeholderTextColor={COLORS.textSecondary}
                            editable={!loading}
                        />
                    </View>

                    <TouchableOpacity
                        onPress={handleAuthentication}
                        disabled={loading}
                        activeOpacity={0.8}
                        style={styles.authButtonContainer}
                    >
                        <LinearGradient
                            colors={COLORS.primaryGradient as [string, string, ...string[]]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.authButton}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.buttonText}>{isLogin ? 'GİRİŞ YAP' : 'KAYIT OL'}</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* [YENİ] Sadece "Kayıt Ol" modunda görünen Yasal Uyarı */}
                    {!isLogin && (
                        <View style={styles.legalContainer}>
                            <Text style={styles.legalText}>
                                Kayıt olarak,{' '}
                                <Text style={styles.linkText} onPress={() => handleOpenLink(TERMS_OF_USE_URL)}>
                                    Kullanım Şartları
                                </Text>
                                {'\'nı ve '}
                                <Text style={styles.linkText} onPress={() => handleOpenLink(PRIVACY_POLICY_URL)}>
                                    Gizlilik Politikası
                                </Text>
                                {'\'nı kabul etmiş olursunuz.'}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={() => setIsLogin(!isLogin)}
                        style={styles.switchButton}
                        disabled={loading}
                    >
                        <Text style={styles.switchText}>
                            {isLogin ? 'Hesabınız yok mu? ' : 'Zaten hesabınız var mı? '}
                            <Text style={styles.switchTextBold}>{isLogin ? 'Kaydolun' : 'Giriş Yapın'}</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: SPACING.l,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    appTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: COLORS.primaryDark,
        marginTop: SPACING.s,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: FONT_SIZES.m,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    formCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: SPACING.l,
        ...SHADOWS.medium,
    },
    formTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: SPACING.l,
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 12,
        paddingHorizontal: SPACING.m,
        marginBottom: SPACING.m,
        height: 56,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputIcon: {
        marginRight: SPACING.s,
    },
    input: {
        flex: 1,
        fontSize: FONT_SIZES.m,
        color: COLORS.text,
        height: '100%',
    },
    authButtonContainer: {
        marginTop: SPACING.s,
        borderRadius: 12,
        overflow: 'hidden',
        ...SHADOWS.small,
    },
    authButton: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: FONT_SIZES.m,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    switchButton: {
        marginTop: SPACING.l,
        alignItems: 'center',
        padding: SPACING.s,
    },
    switchText: {
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.s,
    },
    switchTextBold: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    // [YENİ] Yasal metin stilleri
    legalContainer: {
        marginTop: SPACING.m,
        alignItems: 'center',
        paddingHorizontal: SPACING.s,
    },
    legalText: {
        fontSize: 11,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 16,
    },
    linkText: {
        color: COLORS.primary,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    }
});

export default AuthScreen;