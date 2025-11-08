// BolgeFatihi/AuthScreen.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from 'firebase/auth';
// 🔥 YENİ EKLENENLER: db, doc, setDoc, serverTimestamp
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app } from './firebaseConfig'; 

const auth = getAuth(app); 
// 🔥 YENİ: Firestore veritabanını al
const db = getFirestore(app);

const AuthScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true); 
    const [loading, setLoading] = useState(false);

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
                // 🔥 DEĞİŞİKLİK: Kayıt olan kullanıcının bilgisi "userCredential" içinde
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // 🔥 YENİ: "users" koleksiyonuna yeni kullanıcı belgesi ekle
                // Kullanıcı ID'sini belge ID'si olarak kullanıyoruz
                const userDocRef = doc(db, "users", user.uid);
                await setDoc(userDocRef, {
                    email: user.email,
                    username: user.email?.split('@')[0] || `kullanici_${user.uid.substring(0, 5)}`, // Geçici bir kullanıcı adı
                    createdAt: serverTimestamp()
                });
            }
        } catch (error: any) {
            Alert.alert("Hata", error.message.replace("Firebase: ", ""));
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{isLogin ? 'Giriş Yap' : 'Kaydol'}</Text>
            {/* ... geri kalan JSX içeriği ... */}
            <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
            />
            <TextInput
                style={styles.input}
                placeholder="Şifre"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            {loading ? (
                <ActivityIndicator size="large" color="#FF0000" style={styles.button} />
            ) : (
                <TouchableOpacity style={styles.button} onPress={handleAuthentication}>
                    <Text style={styles.buttonText}>{isLogin ? 'Giriş Yap' : 'Kaydol'}</Text>
                </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchTextContainer}>
                <Text style={styles.switchText}>
                    {isLogin ? 'Hesabınız yok mu? Kaydolun' : 'Zaten bir hesabınız var mı? Giriş yapın'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f0f0f0', },
    title: { fontSize: 32, fontWeight: 'bold', marginBottom: 30, color: '#333', },
    input: { width: '100%', padding: 15, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 15, backgroundColor: '#fff', fontSize: 16, },
    button: { width: '100%', padding: 15, borderRadius: 8, backgroundColor: '#FF0000', alignItems: 'center', marginBottom: 10, },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', },
    switchTextContainer: { marginTop: 20, },
    switchText: { color: '#0000FF', fontSize: 15, }
});

// 🔥 KRİTİK: Bileşeni dışarı aktarıyoruz
export default AuthScreen;
