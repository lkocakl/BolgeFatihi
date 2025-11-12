// AuthScreen.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    GoogleAuthProvider, // Google için eklendi (kalsa da zararı yok)
    signInWithCredential // Google için eklendi (kalsa da zararı yok)
} from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore'; // getDoc eklendi
import { app } from './firebaseConfig'; 
import { useNavigation } from '@react-navigation/native';
// import * as WebBrowser from 'expo-web-browser'; // --- Google için devre dışı bırakıldı ---
// import * as Google from 'expo-auth-session/providers/google'; // --- Google için devre dışı bırakıldı ---

// Google giriş pop-up'ının kapanmasını sağlar
// WebBrowser.maybeCompleteAuthSession(); // --- Google için devre dışı bırakıldı ---

// --- 1. ADIM (WEB): Firebase'den aldığınız WEB ID ---
// const WEB_CLIENT_ID = "<BURAYA-WEB-CLIENT-ID-YAPIŞTIRIN>"; // --- Google için devre dışı bırakıldı ---

// --- 2. ADIM (ANDROID): Adım B'de oluşturduğunuz YENİ ANDROID ID ---
// const ANDROID_CLIENT_ID = "<BURAYA-YENİ-ANDROID-CLIENT-ID-YAPIŞTIRIN>"; // --- Google için devre dışı bırakıldı ---
// ---------------------------------------------------

const auth = getAuth(app); 
const db = getFirestore(app);

const AuthScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true); 
    const [loading, setLoading] = useState(false);
    // const [loadingGoogle, setLoadingGoogle] = useState(false); // --- Google için devre dışı bırakıldı ---
    const navigation = useNavigation();

    // --- Google Giriş Kancaları (Hooks) ---
    // const [request, response, promptAsync] = Google.useIdTokenAuthRequest({ // --- Google için devre dışı bırakıldı ---
    //     webClientId: WEB_CLIENT_ID,
    //     androidClientId: ANDROID_CLIENT_ID,
    // });
    // --- Google Kancaları Sonu ---

    // --- Google Giriş Yanıtını İşleme ---
    // useEffect(() => { // --- Google için devre dışı bırakıldı ---
    //     if (response?.type === 'success') {
    //         setLoadingGoogle(true);
    //         // @ts-ignore - id_token'in params'ta olduğunu biliyoruz
    //         const { id_token } = response.params;
            
    //         const credential = GoogleAuthProvider.credential(id_token);
            
    //         signInWithCredential(auth, credential)
    //             .then(async (userCredential) => {
    //                 const user = userCredential.user;
                    
    //                 // Yeni kullanıcı mı diye kontrol et
    //                 const userDocRef = doc(db, "users", user.uid);
    //                 const docSnap = await getDoc(userDocRef);

    //                 if (!docSnap.exists()) {
    //                     // Yeni kullanıcıysa Firestore'a kaydet
    //                     await setDoc(userDocRef, {
    //                         email: user.email,
    //                         // Google ismini al, yoksa e-postayı kullan
    //                         username: user.displayName || user.email?.split('@')[0] || `kullanici_${user.uid.substring(0, 5)}`,
    //                         createdAt: serverTimestamp()
    //                     });
    //                     console.log("Yeni Google kullanıcısı Firestore'a eklendi.");
    //                 }
                    
    //                 navigation.goBack(); // Giriş başarılı, modal'ı kapat
    //             })
    //             .catch((error) => {
    //                 console.log("Firebase signInWithCredential hatası:", error);
    //                 Alert.alert("Hata (Google)", error.message);
    //             })
    //             .finally(() => {
    //                 setLoadingGoogle(false);
    //             });
    //     } else if (response?.type === 'error') {
    //         console.log("Google Auth Hatası:", response.error);
    //         Alert.alert("Google Giriş Hatası", "Giriş sırasında bir hata oluştu veya işlem iptal edildi.");
    //     }
    // }, [response]);
    // --- Google Yanıt İşleme Sonu ---


    // E-posta/Şifre ile giriş/kayıt
    const handleAuthentication = async () => {
        if (!email || !password) {
            Alert.alert("Hata", "Lütfen email ve şifre girin.");
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
                    createdAt: serverTimestamp()
                });
            }

            navigation.goBack(); 

        } catch (error: any) {
            Alert.alert("Hata", error.message.replace("Firebase: ", ""));
        } finally {
            setLoading(false);
        }
    };

    // Google SVG ikonu (Satır içi)
    // const GoogleIcon = () => ( // --- Google için devre dışı bırakıldı ---
    //     <Image
    //         source={{ uri: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMTcuNiA5LjJsLS4xLTEuOEg5djMuNGgyLjhDMTFoMTMuMiA5LjcgMTQuNyA4LjEgMTQuNyAxMi4yYzAgMy4yLTIuNyA1LjUtNiA1LjVTMiAxNS40IDIgMTIuMiAyLjcgNi4yIDYgNi43YzEuMiAwIDIuMy40IDMuMiAxLjNsMi4yLTIuN0M5LjYgMy42IDcuOSA1IDYgNSAyLjcgNSA1IDcuOCA1IDExLjhzMi43IDYuMyA2LjMgNi4zYzMuMyAwIDUuNy0yLjMgNS43LTUuOUMxMiAyMi41IDExLjMgMjIuMSAxMSA5LjJ6IiBmaWxsPSIjRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48cGF0aCBkPSJNMCAwdjE4aDE4VjBIMHoiLz48L2c+PC9zdmc+' }}
    //         style={styles.googleButtonIcon}
    //     />
    // );


    return (
        <View style={styles.container}>
            <Text style={styles.title}>{isLogin ? 'Giriş Yap' : 'Kaydol'}</Text>
            
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9E9E9E" 
            />
            <TextInput
                style={styles.input}
                placeholder="Şifre"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#9E9E9E" 
            />

            {/* Email/Şifre Butonu */}
            {loading ? (
                <ActivityIndicator size="large" color="#388E3C" style={styles.button} />
            ) : (
                <TouchableOpacity 
                    style={styles.button} 
                    onPress={handleAuthentication}
                    disabled={loading} // --- DÜZELTME: Google kancaları kaldırıldı
                >
                    <Text style={styles.buttonText}>{isLogin ? 'Giriş Yap' : 'Kaydol'}</Text>
                </TouchableOpacity>
            )}

            {/* Ayırıcı */}
            {/* <View style={styles.dividerContainer}> // --- Google için devre dışı bırakıldı ---
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>veya</Text>
                <View style={styles.dividerLine} />
            </View> */}

            {/* Google Giriş Butonu */}
            {/* <TouchableOpacity  // --- Google için devre dışı bırakıldı ---
                style={styles.googleButton} 
                onPress={() => promptAsync()}
                disabled={!request || loading || loadingGoogle}
            >
                {loadingGoogle ? (
                    <ActivityIndicator color="#424242" />
                ) : (
                    <>
                        <GoogleIcon />
                        <Text style={styles.googleButtonText}>Google ile Giriş Yap</Text>
                    </>
                )}
            </TouchableOpacity> */}


            <TouchableOpacity 
                onPress={() => setIsLogin(!isLogin)} 
                style={styles.switchTextContainer}
                disabled={loading} // --- DÜZELTME: Google kancaları kaldırıldı
            >
                <Text style={styles.switchText}>
                    {isLogin ? 'Hesabınız yok mu? Kaydolun' : 'Zaten bir hesabınız var mı? Giriş yapın'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

// Stil
const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 20, 
        backgroundColor: '#F4F4F1', // Açık Toprak Rengi
    },
    title: { 
        fontSize: 32, 
        fontWeight: 'bold', 
        marginBottom: 30, 
        color: '#424242', // Koyu Toprak
    },
    input: { 
        width: '100%', 
        padding: 15, 
        borderWidth: 1, 
        borderColor: '#ddd', 
        borderRadius: 8, 
        marginBottom: 15, 
        backgroundColor: '#fff', 
        fontSize: 16, 
        color: '#424242', // Yazı rengi
    },
    button: { 
        width: '100%', 
        padding: 15, 
        borderRadius: 8, 
        backgroundColor: '#388E3C', // Sağlık Yeşili
        alignItems: 'center', 
        marginBottom: 10, 
        minHeight: 50, // Yükleme göstergesi için min yükseklik
        justifyContent: 'center',
    },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', },
    
    // --- YENİ Stiller: Google Butonu ve Ayırıcı ---
    // dividerContainer: { // --- Google için devre dışı bırakıldı ---
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     width: '100%',
    //     marginVertical: 20,
    // },
    // dividerLine: { // --- Google için devre dışı bırakıldı ---
    //     flex: 1,
    //     height: 1,
    //     backgroundColor: '#ddd',
    // },
    // dividerText: { // --- Google için devre dışı bırakıldı ---
    //     marginHorizontal: 10,
    //     color: '#757575', // Orta Gri
    //     fontSize: 14,
    // },
    // googleButton: { // --- Google için devre dışı bırakıldı ---
    //     flexDirection: 'row',
    //     alignItems: 'center',
    //     justifyContent: 'center',
    //     backgroundColor: '#FFFFFF',
    //     width: '100%',
    //     padding: 15,
    //     borderRadius: 8,
    //     borderWidth: 1,
    //     borderColor: '#ddd',
    //     minHeight: 50,
    //     marginBottom: 10,
    // },
    // googleButtonIcon: { // --- Google için devre dışı bırakıldı ---
    //     width: 18,
    //     height: 18,
    //     marginRight: 10,
    // },
    // googleButtonText: { // --- Google için devre dışı bırakıldı ---
    //     color: '#424242', // Koyu Toprak
    //     fontSize: 18,
    //     fontWeight: 'bold',
    // },
    // --- YENİ Stiller Sonu ---
    
    switchTextContainer: { marginTop: 20, },
    switchText: { 
        color: '#1E88E5', // Gökyüzü Mavisi
        fontSize: 15, 
    }
});

export default AuthScreen;
