// ProfileScreen.tsx

import React, { useState, useEffect } from 'react';
import { 
    StyleSheet, View, Text, ActivityIndicator, ScrollView, 
    TextInput, TouchableOpacity, Alert 
} from 'react-native';
import { 
    collection, query, where, onSnapshot, 
    doc, getDoc, updateDoc, QuerySnapshot, DocumentData
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { signOut } from 'firebase/auth';
import { useAuth } from './AuthContext';

// DEĞİŞİKLİK: Arayüzü genişlet
interface UserStats {
    // Mevcut Sahiplik
    totalRoutesOwned: number;
    totalDistanceOwned: number; // KM
    totalGaspScoreOwned: number;
    // Tüm Zamanlar
    totalRuns: number; // Toplam oluşturulan koşu
    totalDistanceRun: number; // Toplam koşulan mesafe
}

const ProfileScreen = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const { user } = useAuth(); 
    
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    
    // DEĞİŞİKLİK: State'i yeni arayüze göre başlat
    const [stats, setStats] = useState<UserStats>({
        totalRoutesOwned: 0,
        totalDistanceOwned: 0,
        totalGaspScoreOwned: 0,
        totalRuns: 0,
        totalDistanceRun: 0,
    });

    // 2. Adım - Profil bilgilerini (username, email) çek (Değişiklik yok)
    useEffect(() => {
        if (user) { 
            setLoading(true); 
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
            // Yüklemeyi 3. Adım'a bırakıyoruz
        } else {
            // Kullanıcı yoksa temizle
            setUsername('');
            setEmail('');
            setStats({
                totalRoutesOwned: 0,
                totalDistanceOwned: 0,
                totalGaspScoreOwned: 0,
                totalRuns: 0,
                totalDistanceRun: 0,
            });
            setLoading(false);
        }
    }, [user]); 

    // 3. Adım - İstatistikleri dinle (KOMPLE DEĞİŞTİ)
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true); 
        const routesCollectionRef = collection(db, "routes");
        
        // --- YENİ SORGULAMA MANTIĞI ---

        // 1. Sorgu: Mevcut Sahipliklerim (ownerId benim)
        const ownerQuery = query(routesCollectionRef, where("ownerId", "==", user.uid));
        
        // 2. Sorgu: Benim Oluşturduklarım (userId benim)
        const creatorQuery = query(routesCollectionRef, where("userId", "==", user.uid));

        const processOwnerData = (querySnapshot: QuerySnapshot<DocumentData>) => {
            let totalRoutesOwned = 0;
            let totalDistanceOwned = 0;
            let totalGaspScoreOwned = 0;

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                totalRoutesOwned += 1;
                totalDistanceOwned += data['distanceKm'] || 0;
                totalGaspScoreOwned += data['gaspScore'] || 0;
            });
            
            // State'i GÜNCELLE (Önceki değerleri koruyarak)
            setStats(prevStats => ({
                ...prevStats,
                totalRoutesOwned,
                totalDistanceOwned: parseFloat(totalDistanceOwned.toFixed(2)),
                totalGaspScoreOwned,
            }));
        };
        
        const processCreatorData = (querySnapshot: QuerySnapshot<DocumentData>) => {
            let totalRuns = 0;
            let totalDistanceRun = 0;

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                totalRuns += 1;
                totalDistanceRun += data['distanceKm'] || 0;
            });

            // State'i GÜNCELLE (Önceki değerleri koruyarak)
            setStats(prevStats => ({
                ...prevStats,
                totalRuns,
                totalDistanceRun: parseFloat(totalDistanceRun.toFixed(2)),
            }));
        };

        // İki sorguyu da aynı anda dinle
        const unsubscribeOwner = onSnapshot(ownerQuery, (snapshot) => {
            processOwnerData(snapshot);
            setLoading(false); // Her iki sorgudan biri bittiğinde yüklemeyi kapatabiliriz
        }, (error) => {
            console.error("Sahiplik istatistikleri çekilirken hata oluştu: ", error);
            setLoading(false);
        });
        
        const unsubscribeCreator = onSnapshot(creatorQuery, (snapshot) => {
            processCreatorData(snapshot);
            setLoading(false);
        }, (error) => {
            console.error("Oluşturucu istatistikleri çekilirken hata oluştu: ", error);
            setLoading(false);
        });

        // Bileşen (component) kaldırıldığında iki dinleyiciyi de kapat
        return () => {
            unsubscribeOwner();
            unsubscribeCreator();
        };
        
        // --- SORGULAMA MANTIĞI SONU ---
        
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
                <ActivityIndicator size="large" color="#FF5722" /> 
                <Text style={styles.text}>Profil Yükleniyor...</Text>
            </View>
        );
    }

    // Kullanıcı giriş yapmamışsa (Değişiklik yok)
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

            
            {/* --- DEĞİŞİKLİK: İstatistik Başlıkları ve Kutuları --- */}
            
            <Text style={styles.statsTitle}>Rekabet İstatistikleri (Mevcut Sahiplik)</Text>
            <View style={styles.statsGrid}>
                <StatBox title="Sahip Olunan Bölge" value={`${stats.totalRoutesOwned}`} unit="Adet" color="#2196F3" />
                <StatBox title="Sahip Olunan Mesafe" value={`${stats.totalDistanceOwned}`} unit="KM" color="#2196F3" />
                <StatBox title="Toplam Bölge Puanı" value={`${stats.totalGaspScoreOwned}`} unit="Puan" color="#FFC107" />
            </View>

            <Text style={styles.statsTitle}>Kişisel İstatistikler (Tüm Zamanlar)</Text>
            <View style={styles.statsGrid}>
                <StatBox title="Toplam Koşu" value={`${stats.totalRuns}`} unit="Adet" color="#4CAF50" />
                <StatBox title="Toplam Mesafe" value={`${stats.totalDistanceRun}`} unit="KM" color="#4CAF50" />
            </View>

            {/* --- DEĞİŞİKLİK SONU --- */}


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
    statBox: { backgroundColor: 'white', borderRadius: 15, padding: 15, width: '45%', alignItems: 'center', marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3, minHeight: 120, // Opsiyonel: Kutuların eşit boyda görünmesi için
        justifyContent: 'center', // Opsiyonel
    },
    statValue: { fontSize: 36, fontWeight: 'bold', },
    statUnit: { fontSize: 14, color: '#888', marginBottom: 5, },
    statTitle: { fontSize: 16, fontWeight: '500', textAlign: 'center', color: '#333', },
    infoText: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 10, paddingHorizontal: 10, },
    text: { marginTop: 20, fontSize: 16, color: '#666', },
    label: { fontSize: 14, color: '#555', marginBottom: 5, fontWeight: '500', },
    input: { width: '100%', padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 15, backgroundColor: '#fff', fontSize: 16, },
    disabledInput: { backgroundColor: '#f0f0f0', color: '#888', },
    button: { width: '100%', padding: 15, borderRadius: 8, backgroundColor: '#4CAF50', alignItems: 'center', },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', },
    disabledButton: { backgroundColor: '#aaa', },
    signOutButton: { marginVertical: 30, padding: 15, borderRadius: 8, backgroundColor: '#F44336', alignItems: 'center', },
    signOutButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', },
});

export default ProfileScreen;
