import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Keyboard } from 'react-native';
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { useAuth } from './AuthContext';
import { useAlert } from './AlertContext';
import { SPACING, SHADOWS } from './constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { sendPushNotification } from './utils';
import { useTheme } from './ThemeContext';
import { useTranslation } from 'react-i18next'; // [YENİ]

const SocialSearchScreen = () => {
    const { user, userProfile } = useAuth();
    const { showAlert } = useAlert();
    const { colors, isDark } = useTheme();
    const { t } = useTranslation(); // [YENİ]

    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [sentRequestIds, setSentRequestIds] = useState<string[]>([]);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "friend_requests"), where("fromId", "==", user.uid), where("status", "==", "pending"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setSentRequestIds(snapshot.docs.map(doc => doc.data().toId));
        });
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (searchTerm.trim().length < 3) {
            setSearchResults([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const delayDebounceFn = setTimeout(async () => {
            try {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("username", ">=", searchTerm), where("username", "<=", searchTerm + '\uf8ff'));
                const querySnapshot = await getDocs(q);
                const users: any[] = [];
                querySnapshot.forEach((doc) => {
                    if (doc.id !== user?.uid) users.push({ id: doc.id, ...doc.data() });
                });
                setSearchResults(users);
            } catch (error) {
            } finally {
                setLoading(false);
            }
        }, 600);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, user]);

    const sendFriendRequest = async (targetUser: any) => {
        if (!user || !userProfile) return;
        if (userProfile.friends?.includes(targetUser.id)) {
            showAlert(t('common.info'), t('social.alreadyFriends'), 'info');
            return;
        }
        if (sentRequestIds.includes(targetUser.id)) {
            showAlert(t('common.info'), t('social.requestPending'), 'info');
            return;
        }
        try {
            await addDoc(collection(db, "friend_requests"), {
                fromId: user.uid, fromName: userProfile.username, fromPhoto: userProfile.profileImage || null,
                toId: targetUser.id, status: 'pending', createdAt: serverTimestamp()
            });
            showAlert(t('common.success'), t('social.friendRequestSent'), 'success');
            if (targetUser.expoPushToken) {
                sendPushNotification(targetUser.expoPushToken, "Yeni Arkadaş İsteği! 👥", `${userProfile.username} seni eklemek istiyor.`);
            }
        } catch (error) {
            showAlert(t('common.error'), "İstek gönderilemedi.", 'error');
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const isFriend = userProfile?.friends?.includes(item.id);
        const isRequestSent = sentRequestIds.includes(item.id);
        let buttonIcon = "account-plus";
        let buttonColor = colors.secondary;
        let isDisabled = false;
        let statusText = "";

        if (isFriend) {
            buttonIcon = "account-check"; buttonColor = "#4CAF50"; isDisabled = true; statusText = t('social.youAreFriends');
        } else if (isRequestSent) {
            buttonIcon = "account-clock"; buttonColor = "#FFB74D"; isDisabled = true; statusText = t('social.requestSent');
        }

        return (
            <View style={[styles.userCard, { backgroundColor: colors.surface }]}>
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
                        <Text style={[styles.username, { color: colors.text }]}>{item.username}</Text>
                        <Text style={[styles.score, { color: colors.textSecondary }]}>{statusText ? statusText : `${item.totalScore || 0} ${t('social.score')}`}</Text>
                    </View>
                </View>
                <TouchableOpacity style={[styles.addButton, { backgroundColor: buttonColor, opacity: isDisabled ? 0.7 : 1 }]} onPress={() => sendFriendRequest(item)} disabled={isDisabled}>
                    <MaterialCommunityIcons name={buttonIcon as any} size={20} color="white" />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.searchContainer}>
                <View style={[styles.inputWrapper, { backgroundColor: colors.surface }]}>
                    <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} style={{ marginLeft: 10 }} />
                    <TextInput
                        style={[styles.input, { color: colors.text }]} placeholder={t('social.searchPlaceholder')}
                        value={searchTerm} onChangeText={setSearchTerm} autoCapitalize="none" placeholderTextColor={colors.textSecondary}
                    />
                    {searchTerm.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchTerm(''); setSearchResults([]); Keyboard.dismiss(); }}>
                            <MaterialCommunityIcons name="close-circle" size={20} color={colors.textSecondary} style={{ marginRight: 10 }} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            {loading && <View style={{ padding: 20 }}><ActivityIndicator size="small" color={colors.primary} /></View>}
            <FlatList
                data={searchResults} keyExtractor={item => item.id} renderItem={renderItem}
                keyboardShouldPersistTaps="handled" onScroll={() => Keyboard.dismiss()}
                ListEmptyComponent={
                    !loading && searchTerm.length >= 3 ? <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Kullanıcı bulunamadı.</Text> : null
                }
            />
        </View>
    );
};

// ... (styles aynı)
const styles = StyleSheet.create({
    container: { flex: 1, padding: SPACING.m },
    searchContainer: { marginBottom: SPACING.m },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, height: 50, ...SHADOWS.small },
    input: { flex: 1, height: '100%', paddingHorizontal: SPACING.s, fontSize: 16 },
    userCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.m, borderRadius: 12, marginBottom: SPACING.m, ...SHADOWS.small },
    userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    username: { fontWeight: 'bold', fontSize: 16 },
    score: { fontSize: 12 },
    addButton: { padding: 8, borderRadius: 20, marginLeft: 10 },
    emptyText: { textAlign: 'center', marginTop: 20, fontStyle: 'italic' }
});

export default SocialSearchScreen;