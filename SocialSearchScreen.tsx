import React, { useState } from 'react';
import { 
    View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Image 
} from 'react-native';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { useAuth } from './AuthContext';
import { useAlert } from './AlertContext';
import { COLORS, SPACING, SHADOWS } from './constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { sendPushNotification } from './utils';

const SocialSearchScreen = () => {
    const { user, userProfile } = useAuth();
    const { showAlert } = useAlert();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (searchTerm.trim().length < 3) {
            showAlert("Uyarı", "En az 3 karakter girmelisiniz.", 'warning');
            return;
        }

        setLoading(true);
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("username", ">=", searchTerm), where("username", "<=", searchTerm + '\uf8ff'));
            
            const querySnapshot = await getDocs(q);
            const users: any[] = [];
            
            querySnapshot.forEach((doc) => {
                if (doc.id !== user?.uid) { 
                    users.push({ id: doc.id, ...doc.data() });
                }
            });

            if (users.length === 0) {
                showAlert("Bulunamadı", "Böyle bir kullanıcı yok.", 'warning');
            }
            setSearchResults(users);
        } catch (error) {
            console.error("Arama hatası:", error);
            showAlert("Hata", "Arama yapılamadı.", 'error');
        } finally {
            setLoading(false);
        }
    };

    const sendFriendRequest = async (targetUser: any) => {
        if (!user || !userProfile) return;

        try {
            await addDoc(collection(db, "friend_requests"), {
                fromId: user.uid,
                fromName: userProfile.username,
                fromPhoto: userProfile.profileImage || null,
                toId: targetUser.id,
                status: 'pending',
                createdAt: serverTimestamp()
            });

            showAlert("Başarılı", "Arkadaşlık isteği gönderildi!", 'success');

            if (targetUser.expoPushToken) {
                await sendPushNotification(
                    targetUser.expoPushToken,
                    "Yeni Arkadaş İsteği! 👥",
                    `${userProfile.username} seni arkadaş olarak eklemek istiyor.`
                );
            }

        } catch (error) {
            console.error("İstek gönderme hatası:", error);
            showAlert("Hata", "İstek gönderilemedi.", 'error');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <TextInput 
                    style={styles.input}
                    placeholder="Kullanıcı adı ara..."
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    autoCapitalize="none"
                />
                <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
                    {loading ? <ActivityIndicator color="white" /> : <MaterialCommunityIcons name="magnify" size={24} color="white" />}
                </TouchableOpacity>
            </View>

            <FlatList
                data={searchResults}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.userCard}>
                        <View style={styles.userInfo}>
                            {item.profileImage ? (
                                <Image source={{ uri: item.profileImage }} style={styles.avatar} />
                            ) : (
                                <View style={[styles.avatar, { backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' }]}>
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>
                                        {item.username?.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <View style={{ marginLeft: 10 }}>
                                <Text style={styles.username}>{item.username}</Text>
                                <Text style={styles.score}>{item.totalScore || 0} Puan</Text>
                            </View>
                        </View>
                        <TouchableOpacity 
                            style={styles.addButton} 
                            onPress={() => sendFriendRequest(item)}
                        >
                            <MaterialCommunityIcons name="account-plus" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.m },
    searchContainer: { flexDirection: 'row', marginBottom: SPACING.l },
    input: { 
        flex: 1, backgroundColor: 'white', borderRadius: 12, 
        padding: SPACING.m, marginRight: SPACING.s, ...SHADOWS.small 
    },
    searchButton: { 
        backgroundColor: COLORS.primary, borderRadius: 12, 
        width: 50, justifyContent: 'center', alignItems: 'center', ...SHADOWS.small 
    },
    userCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'white', padding: SPACING.m, borderRadius: 12,
        marginBottom: SPACING.m, ...SHADOWS.small
    },
    userInfo: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    username: { fontWeight: 'bold', fontSize: 16, color: COLORS.text },
    score: { fontSize: 12, color: COLORS.textSecondary },
    addButton: { 
        backgroundColor: COLORS.secondary, padding: 8, borderRadius: 20 
    }
});

export default SocialSearchScreen;