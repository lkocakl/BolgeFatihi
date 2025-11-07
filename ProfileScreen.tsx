import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';

// İstatistik verilerini tutacak arayüz
interface UserStats {
    totalRuns: number;
    totalDistance: number; // KM
    totalGaspScore: number;
}

const CURRENT_USER_ID = "kullanici_123"; // Şimdilik sabit kullanıcı

const ProfileScreen = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<UserStats>({
        totalRuns: 0,
        totalDistance: 0,
        totalGaspScore: 0,
    });

    useEffect(() => {
        const routesCollectionRef = collection(db, "routes");
        
        // 🔥 Sadece mevcut kullanıcının rotalarını çek 🔥
        const userQuery = query(routesCollectionRef, where("userId", "==", CURRENT_USER_ID));
        
        // Gerçek zamanlı dinleme
        const unsubscribe = onSnapshot(userQuery, (querySnapshot) => {
            let totalRuns = 0;
            let totalDistance = 0;
            let totalGaspScore = 0;

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                totalRuns += 1;
                totalDistance += data.distanceKm || 0;
                totalGaspScore += data.gaspScore || 0;
            });

            setStats({
                totalRuns,
                totalDistance: parseFloat(totalDistance.toFixed(2)),
                totalGaspScore,
            });
            setLoading(false);
        }, (error) => {
            console.error("Kullanıcı istatistikleri çekilirken hata oluştu: ", error);
            setLoading(false);
        });

        // Temizleme: Dinlemeyi durdur
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#FF0000" />
                <Text style={styles.text}>Profil Yükleniyor...</Text>
            </View>
        );
    }
    
    return (
        <ScrollView style={styles.container}>
            <View style={styles.profileCard}>
                <Text style={styles.header}>👤 Profilim</Text>
                <Text style={styles.username}>@{CURRENT_USER_ID}</Text>
            </View>

            <Text style={styles.statsTitle}>Genel İstatistikler</Text>
            
            <View style={styles.statsGrid}>
                <StatBox title="Toplam Koşu" value={`${stats.totalRuns}`} unit="Koşu" color="#007AFF" />
                <StatBox title="Toplam Mesafe" value={`${stats.totalDistance}`} unit="KM" color="#4CD964" />
                <StatBox title="Toplam Gasp Puanı" value={`${stats.totalGaspScore}`} unit="Puan" color="#FF0000" />
            </View>

            <Text style={styles.infoText}>
                Fethedilen rotalarınızı haritada (Harita sekmesi) yeşil çizgiler olarak görebilirsiniz.
            </Text>
        </ScrollView>
    );
};

// Yardımcı bileşen: StatBox
const StatBox = ({ title, value, unit, color }: { title: string, value: string, unit: string, color: string }) => (
    <View style={styles.statBox}>
        <Text style={[styles.statValue, { color: color }]}>{value}</Text>
        <Text style={styles.statUnit}>{unit}</Text>
        <Text style={styles.statTitle}>{title}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 50,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
    },
    header: {
        fontSize: 28,
        fontWeight: '900',
        color: '#333',
        marginBottom: 5,
    },
    username: {
        fontSize: 18,
        color: '#888',
        fontWeight: '500',
    },
    statsTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#555',
        marginBottom: 15,
        textAlign: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#ddd',
        paddingBottom: 5,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        marginBottom: 30,
    },
    statBox: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 15,
        width: '45%',
        alignItems: 'center',
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    statValue: {
        fontSize: 36,
        fontWeight: 'bold',
    },
    statUnit: {
        fontSize: 14,
        color: '#888',
        marginBottom: 5,
    },
    statTitle: {
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
        color: '#333',
    },
    infoText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        marginTop: 10,
        paddingHorizontal: 10,
    },
    text: {
        marginTop: 20,
        fontSize: 16,
        color: '#666',
    }
});

export default ProfileScreen;