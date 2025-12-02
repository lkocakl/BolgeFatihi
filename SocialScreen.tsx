import React, { useState, useEffect } from 'react';
import { 
    View, Text, FlatList, StyleSheet, TouchableOpacity
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { 
    collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, deleteDoc, getDoc, setDoc 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { useAuth } from './AuthContext';
import { useAlert } from './AlertContext';
import { COLORS, SPACING, SHADOWS, FONT_SIZES } from './constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const SocialScreen = () => {
    const { user, userProfile } = useAuth();
    const { showAlert } = useAlert();
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
    const [requests, setRequests] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;

        const requestsRef = collection(db, "friend_requests");
        const qRequests = query(requestsRef, where("toId", "==", user.uid), where("status", "==", "pending"));
        
        const unsubRequests = onSnapshot(qRequests, (snapshot) => {
            setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        if (userProfile) {
           loadFriends();
        }

        return () => {
            unsubRequests();
        };
    }, [user, userProfile]);

    const loadFriends = async () => {
        if (!user) return;
        
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const friendIds = userDoc.data()?.friends || [];

        if (friendIds.length > 0) {
             const friendsData = [];
             for (const fId of friendIds) {
                 const fDoc = await getDoc(doc(db, "users", fId));
                 if (fDoc.exists()) {
                     friendsData.push({ id: fId, ...fDoc.data() });
                 }
             }
             setFriends(friendsData);
        } else {
            setFriends([]);
        }
    };

    const handleAccept = async (request: any) => {
        if (!user) return;
        try {
            await deleteDoc(doc(db, "friend_requests", request.id));

            const myRef = doc(db, "users", user.uid);
            const senderRef = doc(db, "users", request.fromId);

            await updateDoc(myRef, { friends: arrayUnion(request.fromId) });
            await updateDoc(senderRef, { friends: arrayUnion(user.uid) });

            const chatId = [user.uid, request.fromId].sort().join('_');
            const chatRef = doc(db, "chats", chatId);
            await setDoc(chatRef, {
                participants: [user.uid, request.fromId],
                createdAt: new Date(),
                lastMessage: "Sohbet başladı!",
                lastMessageTime: new Date()
            }, { merge: true });

            showAlert("Harika!", `${request.fromName} ile artık arkadaşsınız.`, 'success');
            loadFriends(); 

        } catch (error) {
            console.error("Kabul hatası:", error);
            showAlert("Hata", "İşlem başarısız.", 'error');
        }
    };

    const openChat = (friend: any) => {
        const chatId = [user?.uid, friend.id].sort().join('_');
        (navigation as any).navigate('ChatScreen', {
            chatId: chatId,
            friendId: friend.id,
            friendName: friend.username,
            profileImage: friend.profileImage // EKLENDİ: Profil resmi gönderiliyor
        });
    };

    const renderRequest = ({ item }: any) => (
        <View style={styles.card}>
            <View style={styles.friendInfo}>
                <View style={styles.avatarPlaceholder}>
                     <Text style={styles.avatarText}>{item.fromName?.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                    <Text style={styles.friendName}>{item.fromName}</Text>
                    <Text style={styles.friendScore}>Arkadaşlık İsteği</Text>
                </View>
            </View>
            <TouchableOpacity onPress={() => handleAccept(item)} style={styles.btnAccept}>
                <Text style={styles.btnText}>Kabul Et</Text>
            </TouchableOpacity>
        </View>
    );

    const renderFriend = ({ item }: any) => (
        <TouchableOpacity style={styles.card} onPress={() => openChat(item)}>
            <View style={styles.friendInfo}>
                <View style={styles.avatarPlaceholder}>
                     <Text style={styles.avatarText}>{item.username?.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                    <Text style={styles.friendName}>{item.username}</Text>
                    <Text style={styles.friendScore}>Puan: {item.totalScore || 0}</Text>
                </View>
            </View>
            <MaterialCommunityIcons name="message-text-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <LinearGradient colors={[COLORS.surface, '#F0F4C3']} style={StyleSheet.absoluteFill} />
            
            <View style={styles.headerContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                     <View>
                        <Text style={styles.headerTitle}>Sosyal</Text>
                        <Text style={styles.headerSubtitle}>Arkadaşlarınla Yarış</Text>
                     </View>
                     <TouchableOpacity 
                        style={styles.addFriendButton}
                        onPress={() => (navigation as any).navigate('SearchUser')}
                     >
                        <MaterialCommunityIcons name="account-plus" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.tabsContainer}>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'friends' && styles.activeTab]} 
                        onPress={() => setActiveTab('friends')}>
                        <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>Arkadaşlarım</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tab, activeTab === 'requests' && styles.activeTab]} 
                        onPress={() => setActiveTab('requests')}>
                        <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
                            İstekler {requests.length > 0 && `(${requests.length})`}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {activeTab === 'friends' ? (
                <FlatList
                    data={friends}
                    renderItem={renderFriend}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                             <MaterialCommunityIcons name="account-group-outline" size={48} color={COLORS.textSecondary} />
                             <Text style={styles.emptyText}>Henüz arkadaşın yok.</Text>
                        </View>
                    }
                    contentContainerStyle={styles.listContent}
                />
            ) : (
                <FlatList
                    data={requests}
                    renderItem={renderRequest}
                    keyExtractor={item => item.id}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                             <Text style={styles.emptyText}>Yeni istek yok.</Text>
                        </View>
                    }
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerContainer: {
        paddingTop: SPACING.xl + 20,
        paddingBottom: SPACING.s, 
        paddingHorizontal: SPACING.l,
        backgroundColor: COLORS.surface,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        ...SHADOWS.small,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: FONT_SIZES.xxl,
        fontWeight: '800',
        color: COLORS.primaryDark,
    },
    headerSubtitle: {
        fontSize: FONT_SIZES.s,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    addFriendButton: {
        padding: 8,
        backgroundColor: '#F5F5F5',
        borderRadius: 20,
    },
    tabsContainer: {
        flexDirection: 'row',
        marginTop: SPACING.m,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: 'white',
        ...SHADOWS.small,
    },
    tabText: {
        fontSize: FONT_SIZES.s,
        color: COLORS.textSecondary,
        fontWeight: '600'
    },
    activeTabText: {
        color: COLORS.primary,
        fontWeight: 'bold'
    },
    listContent: {
        paddingHorizontal: SPACING.m,
        paddingTop: SPACING.m,
        paddingBottom: SPACING.xl,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        padding: SPACING.m,
        marginBottom: SPACING.s,
        borderRadius: 16,
        ...SHADOWS.small,
    },
    friendInfo: { flexDirection: 'row', alignItems: 'center' },
    avatarPlaceholder: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0E0E0',
        justifyContent: 'center', alignItems: 'center', marginRight: 12
    },
    avatarText: { fontSize: 18, fontWeight: 'bold', color: '#555' },
    friendName: { fontSize: FONT_SIZES.m, fontWeight: '700', color: COLORS.text },
    friendScore: { fontSize: FONT_SIZES.s, color: COLORS.textSecondary },
    btnAccept: {
        backgroundColor: COLORS.primary,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8
    },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        marginTop: SPACING.s,
        color: COLORS.textSecondary,
        fontSize: FONT_SIZES.m
    }
});

export default SocialScreen;