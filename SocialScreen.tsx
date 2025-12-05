import React, { useState, useEffect } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity
} from 'react-native';
// ... (Importlar aynı)
import { useNavigation } from '@react-navigation/native';
import {
    collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, deleteDoc, getDoc, setDoc
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { useAuth } from './AuthContext';
import { useAlert } from './AlertContext';
import { SPACING, SHADOWS, FONT_SIZES } from './constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from './ThemeContext';
import { useTranslation } from 'react-i18next'; // [YENİ]

const SocialScreen = () => {
    const { user, userProfile } = useAuth();
    const { showAlert } = useAlert();
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();
    const { t } = useTranslation(); // [YENİ]

    // ... (State'ler ve useEffect'ler aynı)
    const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
    const [requests, setRequests] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);
    const [unreadMap, setUnreadMap] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        if (!user) return;
        const requestsRef = collection(db, "friend_requests");
        const qRequests = query(requestsRef, where("toId", "==", user.uid), where("status", "==", "pending"));
        const unsubRequests = onSnapshot(qRequests, (snapshot) => {
            setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubRequests();
    }, [user]);

    useEffect(() => {
        if (userProfile) loadFriends();
    }, [userProfile]);

    useEffect(() => {
        if (!user) return;
        const qChats = query(collection(db, "chats"), where("participants", "array-contains", user.uid));
        const unsubChats = onSnapshot(qChats, (snapshot) => {
            const newUnreadMap: { [key: string]: number } = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const friendId = data.participants.find((id: string) => id !== user.uid);
                const myUnreadCount = data.unreadCounts ? data.unreadCounts[user.uid] : 0;
                if (friendId && myUnreadCount > 0) {
                    newUnreadMap[friendId] = myUnreadCount;
                }
            });
            setUnreadMap(newUnreadMap);
        }, (error) => { });
        return () => unsubChats();
    }, [user]);

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
        // ... (Mantık aynı)
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
                lastMessage: t('social.chatStart'),
                lastMessageTime: new Date(),
                unreadCounts: { [user.uid]: 0, [request.fromId]: 0 }
            }, { merge: true });
            showAlert(t('common.success'), t('social.alreadyFriends'), 'success');
            loadFriends();
        } catch (error) {
            showAlert(t('common.error'), "İşlem başarısız.", 'error');
        }
    };

    const openChat = (friend: any) => {
        const chatId = [user?.uid, friend.id].sort().join('_');
        (navigation as any).navigate('ChatScreen', {
            chatId: chatId,
            friendId: friend.id,
            friendName: friend.username,
            profileImage: friend.profileImage
        });
    };

    const renderRequest = ({ item }: any) => (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.friendInfo}>
                <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{item.fromName?.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                    <Text style={[styles.friendName, { color: colors.text }]}>{item.fromName}</Text>
                    <Text style={[styles.friendScore, { color: colors.textSecondary }]}>{t('social.friendReqTitle')}</Text>
                </View>
            </View>
            <TouchableOpacity onPress={() => handleAccept(item)} style={[styles.btnAccept, { backgroundColor: colors.primary }]}>
                <Text style={styles.btnText}>{t('social.accept')}</Text>
            </TouchableOpacity>
        </View>
    );

    const renderFriend = ({ item }: any) => {
        const unreadCount = unreadMap[item.id] || 0;
        return (
            <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface }]} onPress={() => openChat(item)}>
                <View style={styles.friendInfo}>
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{item.username?.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View>
                        <Text style={[styles.friendName, { color: colors.text }]}>{item.username}</Text>
                        <Text style={[styles.friendScore, { color: colors.textSecondary }]}>{t('social.score')}: {item.totalScore || 0}</Text>
                    </View>
                </View>
                {unreadCount > 0 ? (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{unreadCount}</Text>
                    </View>
                ) : (
                    <MaterialCommunityIcons name="message-text-outline" size={24} color={colors.primary} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <LinearGradient colors={isDark ? [colors.surface, colors.background] : [colors.surface, '#F0F4C3']} style={StyleSheet.absoluteFill} />

            <View style={[styles.headerContainer, { backgroundColor: colors.surface }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={[styles.headerTitle, { color: colors.primaryDark }]}>{t('social.title')}</Text>
                        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{t('social.subtitle')}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.addFriendButton, { backgroundColor: isDark ? '#333' : '#F5F5F5' }]}
                        onPress={() => (navigation as any).navigate('SearchUser')}
                    >
                        <MaterialCommunityIcons name="account-plus" size={24} color={colors.primary} />
                    </TouchableOpacity>
                </View>
                <View style={[styles.tabsContainer, { backgroundColor: isDark ? '#333' : '#F5F5F5' }]}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'friends' && { backgroundColor: isDark ? '#444' : 'white', ...SHADOWS.small }]}
                        onPress={() => setActiveTab('friends')}>
                        <Text style={[styles.tabText, { color: activeTab === 'friends' ? colors.primary : colors.textSecondary }]}>{t('social.friends')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'requests' && { backgroundColor: isDark ? '#444' : 'white', ...SHADOWS.small }]}
                        onPress={() => setActiveTab('requests')}>
                        <Text style={[styles.tabText, { color: activeTab === 'requests' ? colors.primary : colors.textSecondary }]}>
                            {t('social.requests')} {requests.length > 0 && `(${requests.length})`}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={activeTab === 'friends' ? friends : requests}
                renderItem={activeTab === 'friends' ? renderFriend : renderRequest}
                keyExtractor={item => item.id}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name={activeTab === 'friends' ? "account-group-outline" : "account-clock-outline"} size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            {activeTab === 'friends' ? t('social.noFriends') : t('social.noRequests')}
                        </Text>
                    </View>
                }
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
};

// ... (styles aynı)
const styles = StyleSheet.create({
    container: { flex: 1 },
    headerContainer: {
        paddingTop: SPACING.xl + 20,
        paddingBottom: SPACING.s,
        paddingHorizontal: SPACING.l,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        ...SHADOWS.small,
        zIndex: 10,
    },
    headerTitle: { fontSize: FONT_SIZES.xxl, fontWeight: '800' },
    headerSubtitle: { fontSize: FONT_SIZES.s, marginTop: SPACING.xs },
    addFriendButton: { padding: 8, borderRadius: 20 },
    tabsContainer: { flexDirection: 'row', marginTop: SPACING.m, borderRadius: 12, padding: 4 },
    tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
    tabText: { fontSize: FONT_SIZES.s, fontWeight: '600' },
    listContent: { paddingHorizontal: SPACING.m, paddingTop: SPACING.m, paddingBottom: SPACING.xl },
    card: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: SPACING.m, marginBottom: SPACING.s, borderRadius: 16, ...SHADOWS.small,
    },
    friendInfo: { flexDirection: 'row', alignItems: 'center' },
    avatarPlaceholder: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#E0E0E0',
        justifyContent: 'center', alignItems: 'center', marginRight: 12
    },
    avatarText: { fontSize: 18, fontWeight: 'bold', color: '#555' },
    friendName: { fontSize: FONT_SIZES.m, fontWeight: '700' },
    friendScore: { fontSize: FONT_SIZES.s },
    btnAccept: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
    btnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    emptyContainer: { alignItems: 'center', marginTop: 50 },
    emptyText: { marginTop: SPACING.s, fontSize: FONT_SIZES.m },
    unreadBadge: {
        backgroundColor: '#FF5252', borderRadius: 10, minWidth: 22, height: 22,
        justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5,
    },
    unreadText: { color: 'white', fontSize: 11, fontWeight: 'bold' }
});

export default SocialScreen;