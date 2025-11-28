import React, { useState, useEffect, useRef } from 'react';
import { 
    View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform 
} from 'react-native';
import { 
    collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, setDoc, getDoc
} from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { db } from './firebaseConfig';
import { useAuth } from './AuthContext';
import { COLORS, SPACING, SHADOWS } from './constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { sendPushNotification } from './utils';

const ChatScreen = ({ route }: any) => {
    const { friendId, friendName, chatId } = route.params;
    const { user } = useAuth();
    const navigation = useNavigation();
    const [messages, setMessages] = useState<any[]>([]);
    const [text, setText] = useState('');
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!chatId) return;

        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(msgs);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        });

        return () => unsubscribe();
    }, [chatId]);

    const handleSend = async () => {
        if (text.trim().length === 0 || !user) return;

        try {
            const messagesRef = collection(db, "chats", chatId, "messages");
            await addDoc(messagesRef, {
                text: text.trim(),
                senderId: user.uid,
                createdAt: serverTimestamp()
            });

            const chatRef = doc(db, "chats", chatId);
            await setDoc(chatRef, {
                lastMessage: text.trim(),
                lastMessageTime: serverTimestamp(),
                participants: [user.uid, friendId]
            }, { merge: true });

            const messageText = text.trim();
            setText('');

            // Karşı tarafa bildirim gönder
            const friendUserDoc = await getDoc(doc(db, "users", friendId));
            if (friendUserDoc.exists()) {
                const friendData = friendUserDoc.data();
                const friendToken = friendData.expoPushToken;

                if (friendToken) {
                    await sendPushNotification(
                        friendToken,
                        "Yeni Mesaj 💬",
                        messageText
                    );
                }
            }

        } catch (error) {
            console.error("Mesaj gönderme hatası:", error);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{friendName}</Text>
                <View style={{ width: 28 }} />
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                    const isMe = item.senderId === user?.uid;
                    return (
                        <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.friendMessage]}>
                            <Text style={[styles.messageText, isMe ? { color: 'white' } : { color: COLORS.text }]}>
                                {item.text}
                            </Text>
                        </View>
                    );
                }}
            />

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={text}
                        onChangeText={setText}
                        placeholder="Mesaj yaz..."
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                        <MaterialCommunityIcons name="send" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },
    header: {
        paddingTop: 50, 
        paddingBottom: 15, 
        paddingHorizontal: 15,
        backgroundColor: 'white',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...SHADOWS.small, 
        zIndex: 10
    },
    backButton: { padding: 5 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
    listContent: { padding: SPACING.m, paddingBottom: 20 },
    messageBubble: {
        maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8,
    },
    myMessage: {
        alignSelf: 'flex-end', backgroundColor: COLORS.primary,
        borderBottomRightRadius: 2
    },
    friendMessage: {
        alignSelf: 'flex-start', backgroundColor: 'white',
        borderBottomLeftRadius: 2, ...SHADOWS.small
    },
    messageText: { fontSize: 16 },
    inputContainer: {
        flexDirection: 'row', padding: SPACING.m, backgroundColor: 'white',
        alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EEE'
    },
    input: {
        flex: 1, backgroundColor: '#F0F0F0', borderRadius: 20,
        paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, fontSize: 16
    },
    sendButton: {
        backgroundColor: COLORS.primary, width: 44, height: 44,
        borderRadius: 22, justifyContent: 'center', alignItems: 'center'
    }
});

export default ChatScreen;