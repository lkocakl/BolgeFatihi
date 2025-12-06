import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Image, ActivityIndicator, RefreshControl
} from 'react-native';
import {
    collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc, updateDoc, increment, limitToLast
} from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { db } from './firebaseConfig';
// [YENİ] AuthContext yerine Store
import { useUserStore } from './store/useUserStore';
import { COLORS, SPACING, SHADOWS } from './constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { sendPushNotification } from './utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './ThemeContext';

const ChatScreen = ({ route }: any) => {
    const { friendId, friendName, chatId, profileImage } = route.params;

    // [YENİ] Zustand Store kullanımı
    const user = useUserStore(state => state.user);
    const userProfile = useUserStore(state => state.userProfile);

    const navigation = useNavigation();
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [messages, setMessages] = useState<any[]>([]);
    const [text, setText] = useState('');
    const [limitCount, setLimitCount] = useState(25);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!user || !chatId) return;
        const markAsRead = async () => {
            try {
                const chatRef = doc(db, "chats", chatId);
                await updateDoc(chatRef, { [`unreadCounts.${user.uid}`]: 0 });
            } catch (error) { }
        };
        markAsRead();
    }, [chatId, user, messages.length]);

    useEffect(() => {
        if (!chatId) return;

        setIsLoadingMore(true);
        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"), limitToLast(limitCount));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(msgs);
            setIsLoadingMore(false);

            if (limitCount === 25 || msgs.length <= limitCount) {
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
            }
        });

        return () => unsubscribe();
    }, [chatId, limitCount]);

    const loadOlderMessages = () => {
        if (isLoadingMore) return;
        setLimitCount(prev => prev + 25);
    };

    const handleSend = async () => {
        if (text.trim().length === 0 || !user) return;
        const messageText = text.trim();
        setText('');

        try {
            const messagesRef = collection(db, "chats", chatId, "messages");
            await addDoc(messagesRef, {
                text: messageText,
                senderId: user.uid,
                createdAt: serverTimestamp()
            });

            const chatRef = doc(db, "chats", chatId);
            const chatDoc = await getDoc(chatRef);

            if (chatDoc.exists()) {
                await updateDoc(chatRef, {
                    lastMessage: messageText,
                    lastMessageTime: serverTimestamp(),
                    [`unreadCounts.${friendId}`]: increment(1)
                });
            } else {
                await setDoc(chatRef, {
                    participants: [user.uid, friendId],
                    lastMessage: messageText,
                    lastMessageTime: serverTimestamp(),
                    unreadCounts: { [user.uid]: 0, [friendId]: 1 }
                });
            }

            // Bildirim Gönderme (Güncellendi)
            const friendUserDoc = await getDoc(doc(db, "users", friendId));
            if (friendUserDoc.exists()) {
                const friendData = friendUserDoc.data();
                if (friendData.expoPushToken) {
                    // [YENİ] Data payload eklendi
                    await sendPushNotification(
                        friendData.expoPushToken,
                        "Yeni Mesaj 💬",
                        `${userProfile?.username || 'Biri'}: ${messageText}`,
                        {
                            type: 'chat',
                            chatId: chatId,
                            friendId: user.uid,
                            friendName: userProfile?.username,
                            profileImage: userProfile?.profileImage
                        }
                    );
                }
            }
        } catch (error) {
            console.error("Mesaj gönderme hatası:", error);
            setText(messageText);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: Math.max(insets.top, 20) + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    {profileImage ? (
                        <Image source={{ uri: profileImage }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{friendName?.charAt(0).toUpperCase()}</Text>
                        </View>
                    )}
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{friendName}</Text>
                </View>
                <View style={{ width: 28 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    keyboardDismissMode="on-drag"
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoadingMore && messages.length > 0}
                            onRefresh={loadOlderMessages}
                            tintColor={colors.primary}
                        />
                    }
                    renderItem={({ item }) => {
                        const isMe = item.senderId === user?.uid;
                        return (
                            <View style={[
                                styles.messageBubble,
                                isMe ? { backgroundColor: colors.primary, alignSelf: 'flex-end', borderBottomRightRadius: 2 }
                                    : { backgroundColor: isDark ? '#333' : 'white', alignSelf: 'flex-start', borderBottomLeftRadius: 2 }
                            ]}>
                                <Text style={[styles.messageText, isMe ? { color: 'white' } : { color: colors.text }]}>
                                    {item.text}
                                </Text>
                            </View>
                        );
                    }}
                />

                <View style={[
                    styles.inputContainer,
                    { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 10) }
                ]}>
                    <TextInput
                        style={[styles.input, { backgroundColor: isDark ? '#444' : '#F0F0F0', color: colors.text }]}
                        value={text}
                        onChangeText={setText}
                        placeholder="Mesaj yaz..."
                        placeholderTextColor={colors.textSecondary}
                    />
                    <TouchableOpacity style={[styles.sendButton, { backgroundColor: colors.primary }]} onPress={handleSend}>
                        <MaterialCommunityIcons name="send" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingBottom: 15,
        paddingHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...SHADOWS.small,
        zIndex: 10
    },
    backButton: { padding: 5 },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        paddingLeft: 28
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: SPACING.s },
    avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E0E0E0' },
    avatarPlaceholder: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: '#E0E0E0',
        justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { fontSize: 16, fontWeight: 'bold', color: '#555' },
    listContent: { padding: SPACING.m, paddingBottom: 20 },
    messageBubble: {
        maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8, ...SHADOWS.small
    },
    messageText: { fontSize: 16 },
    inputContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.m,
        paddingTop: SPACING.s,
        alignItems: 'center',
        borderTopWidth: 1,
    },
    input: {
        flex: 1, borderRadius: 20,
        paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, fontSize: 16,
    },
    sendButton: {
        width: 44, height: 44,
        borderRadius: 22, justifyContent: 'center', alignItems: 'center'
    }
});

export default ChatScreen;