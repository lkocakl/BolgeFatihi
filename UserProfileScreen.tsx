import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, Button } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig'; 
import { COLORS, SPACING, FONT_SIZES } from './constants/theme';

interface UserProfile {
    username: string;
    totalScore: number;
    weeklyScore: number;
    profileImage?: string;
    // ... diğer alanlar
}

const UserProfileScreen = ({ route, navigation }: any) => {
    // LeaderboardScreen'den gönderilen parametreleri alıyoruz
    const { userId, username, profileImage } = route.params; 
    
    const [profileData, setProfileData] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const docRef = doc(db, "users", userId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setProfileData(docSnap.data() as UserProfile);
                } else {
                    console.log("Kullanıcı bulunamadı!");
                }
            } catch (error) {
                console.error("Profil çekme hatası:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, [userId]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!profileData) {
        return (
            <View style={styles.center}>
                <Text>Kullanıcı profili yüklenemedi.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                         <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
                    </View>
                )}
                <Text style={styles.username}>{profileData.username}</Text>
                
                {/* ARKADAŞ EKLE BUTONU (Örnek) */}
                <Button 
                    title="Arkadaş Ekle" 
                    onPress={() => alert(`Arkadaşlık isteği ${username}'a gönderildi.`)}
                    color={COLORS.secondaryDark}
                />
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{profileData.totalScore}</Text>
                    <Text style={styles.statLabel}>Toplam Puan</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{profileData.weeklyScore || 0}</Text>
                    <Text style={styles.statLabel}>Bu Haftaki Puan</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.l },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { alignItems: 'center', marginBottom: SPACING.xl },
    avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: SPACING.m },
    avatarPlaceholder: {
        width: 100, height: 100, borderRadius: 50, backgroundColor: '#E0E0E0',
        justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.m
    },
    avatarText: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', color: '#555' },
    username: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold', color: COLORS.text, marginBottom: SPACING.m },
    statsContainer: { flexDirection: 'row', justifyContent: 'space-around' },
    statBox: { alignItems: 'center', padding: SPACING.m, backgroundColor: 'white', borderRadius: 12, width: '45%' },
    statValue: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', color: COLORS.primary },
    statLabel: { fontSize: FONT_SIZES.m, color: COLORS.textSecondary, marginTop: SPACING.s }
});

export default UserProfileScreen;