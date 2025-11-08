// ProfileScreen.tsx

import React, { useState, useEffect } from 'react';
import { 
    StyleSheet, View, Text, ActivityIndicator, ScrollView, 
    TextInput, TouchableOpacity, Alert 
} from 'react-native';
import { 
    collection, query, where, onSnapshot, 
    doc, getDoc, updateDoc 
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { signOut } from 'firebase/auth'; // 'User' ve 'onAuthStateChanged' kaldırıldı
// YENİ: Auth Context
import { useAuth } from './AuthContext';

// ... (UserStats arayüzü aynı) ...
interface UserStats {
    totalRoutesOwned: number;
    totalDistance: number; // KM
    totalGaspScore: number;
}

const ProfileScreen = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // DEĞİŞİKLİK: 'user' state'i SİLİNDİ, Context'ten gelen 'user' kullanılacak
    // const [user, setUser] = useState<User | null>(null); // <-- SİL
    const { user } = useAuth(); // <-- EKLE
    
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [stats, setStats] = useState<UserStats>({
        totalRoutesOwned: 0,
        totalDistance: 0,
        totalGaspScore: 0,
    });

    // SİLİNDİ: 1. Adım - Kullanıcı oturumunu dinle
    // useEffect(() => { ... onAuthStateChanged ... }, []);

    // 2. Adım - Profil bilgilerini (username, email) çek (Değişiklik yok, 'user'a bağımlı)
    useEffect(() => {
        if (user) { // Context'ten gelen 'user'ı kullan
            setLoading(true); // Yüklemeyi burada başlatmak daha mantıklı
            const fetchProfile = async () => {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    setUsername(userData.username || '');
                    setEmail(userData.email || '');
                }
            };
            fetchProfile();
            // Not: Yüklemeyi 'false'a çekmeyi 3. Adım'a (İstatistikler) bırakıyoruz
        } else {
            // Kullanıcı yoksa (çıkış yapmışsa) temizle
            setUsername('');
            setEmail('');
            setStats({ totalRoutesOwned: 0, totalDistance: 0, totalGaspScore: 0 });
            setLoading(false);
        }
    }, [user]); // 'user'a bağımlı

    // 3. Adım - İstatistikleri dinle (Değişiklik yok, 'user'a bağımlı)
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true); 
        const routesCollectionRef = collection(db, "routes");
        const userQuery = query(routesCollectionRef, where("ownerId", "==", user.uid));
        
        const unsubscribe = onSnapshot(userQuery, (querySnapshot) => {
            let totalRoutesOwned = 0;
            let totalDistance = 0;
            let totalGaspScore = 0;

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                totalRoutesOwned += 1;
                totalDistance += data.distanceKm || 0;
                totalGaspScore += data.gaspScore || 0;
            });

            setStats({
                totalRoutesOwned,
                totalDistance: parseFloat(totalDistance.toFixed(2)),
                totalGaspScore,
            });
            setLoading(false); // Veri çekme burada tamamlandı
        }, (error) => {
            console.error("Kullanıcı istatistikleri çekilirken hata oluştu: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]); // 'user'a bağımlı

    // Kullanıcı adını güncelleme (Değişiklik yok)
    const handleUpdateProfile = async () => {
        // ... (kod aynı)
        if (!user) return;
        if (username.length < 3) {
            Alert.alert("Hata", "Kullanıcı adı en az 3 karakter olmalıdır.");
            return;
        }
        setSaving(true);
        try {
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, { username: username });
            Alert.alert("Başarılı", "Kullanıcı adınız güncellendi!");
        } catch (error) {
            console.error("Profil güncellenirken hata:", error);
            Alert.alert("Hata", "Profil güncellenemedi.");
        } finally {
            setSaving(false);
        }
    };

    // Çıkış yapma (Değişiklik yok)
    const handleSignOut = () => {
        // ... (kod aynı)
        signOut(auth).catch((error) => {
            console.error("Çıkış hatası:", error);
            Alert.alert("Hata", "Çıkış yapılamadı.");
        });
    };

    // Yükleniyor ekranı (Değişiklik yok)
    if (loading && user) { 
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#FF0000" />
                <Text style={styles.text}>Profil Yükleniyor...</Text>
            </View>
        );
    }

    // Kullanıcı giriş yapmamışsa (Bu ekran artık gösterilmemeli ama kod kalsa zararı olmaz)
    if (!user) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.header}>Profilim</Text>
                <Text style={styles.text}>Profili görmek için lütfen giriş yapın.</Text>
            </View>
        );
    }
    
    return (
        <ScrollView style={styles.container}>
            {/* Profil kartı (Değişiklik yok) */}
            <View style={styles.profileCard}>
                <Text style={styles.header}>👤 Profilim</Text>
                <Text style={styles.label}>Email (Değiştirilemez)</Text>
                <TextInput style={[styles.input, styles.disabledInput]} value={email} editable={false} />
                <Text style={styles.label}>Kullanıcı Adı</Text>
                <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Kullanıcı adınızı seçin" autoCapitalize="none" />
                <TouchableOpacity style={[styles.button, saving && styles.disabledButton]} onPress={handleUpdateProfile} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Güncelle</Text>}
                </TouchableOpacity>
            </View>

            <Text style={styles.statsTitle}>Genel İstatistikler</Text>
            
            {/* İstatistik kutuları (Değişiklik yok) */}
            <View style={styles.statsGrid}>
                <StatBox title="Sahip Olunan Bölge" value={`${stats.totalRoutesOwned}`} unit="Adet" color="#007AFF" />
                <StatBox title="Sahip Olunan Mesafe" value={`${stats.totalDistance}`} unit="KM" color="#4CD964" />
                <StatBox title="Toplam Bölge Puanı" value={`${stats.totalGaspScore}`} unit="Puan" color="#FF0000" />
            </View>

            {/* Info ve Çıkış Butonu (Değişiklik yok) */}
            <Text style={styles.infoText}>
                Fethedilen rotalarınızı haritada (Harita sekmesi) yeşil çizgiler olarak görebilirsiniz.
            </Text>
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                <Text style={styles.signOutButtonText}>Çıkış Yap</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

// StatBox bileşeni (Değişiklik yok)
const StatBox = ({ title, value, unit, color }: { title: string, value: string, unit: string, color: string }) => (
    // ... (kod aynı)
    <View style={styles.statBox}>
        <Text style={[styles.statValue, { color: color }]}>{value}</Text>
        <Text style={styles.statUnit}>{unit}</Text>
        <Text style={styles.statTitle}>{title}</Text>
    </View>
);

// Stiller (Değişiklik yok)
const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5', },
    centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', },
    profileCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 30, marginTop: 50, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5, },
    header: { fontSize: 28, fontWeight: '900', color: '#333', marginBottom: 20, textAlign: 'center', },
    statsTitle: { fontSize: 20, fontWeight: 'bold', color: '#555', marginBottom: 15, textAlign: 'center', borderBottomWidth: 2, borderBottomColor: '#ddd', paddingBottom: 5, },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', marginBottom: 30, },
    statBox: { backgroundColor: 'white', borderRadius: 15, padding: 15, width: '45%', alignItems: 'center', marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3, },
    statValue: { fontSize: 36, fontWeight: 'bold', },
    statUnit: { fontSize: 14, color: '#888', marginBottom: 5, },
    statTitle: { fontSize: 16, fontWeight: '500', textAlign: 'center', color: '#333', },
    infoText: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 10, paddingHorizontal: 10, },
    text: { marginTop: 20, fontSize: 16, color: '#666', },
    label: { fontSize: 14, color: '#555', marginBottom: 5, fontWeight: '500', },
    input: { width: '100%', padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 15, backgroundColor: '#fff', fontSize: 16, },
    disabledInput: { backgroundColor: '#f0f0f0', color: '#888', },
    button: { width: '100%', padding: 15, borderRadius: 8, backgroundColor: '#00cc00', alignItems: 'center', },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', },
    disabledButton: { backgroundColor: '#aaa', },
    signOutButton: { marginVertical: 30, padding: 15, borderRadius: 8, backgroundColor: '#ff3333', alignItems: 'center', },
    signOutButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', },
});

export default ProfileScreen;
