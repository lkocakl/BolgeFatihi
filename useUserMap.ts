import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
// [DÜZELTME] Dosya bir alt klasörde olduğu için bir üst dizine çıkmak gerekir (../)
import { db } from '../firebaseConfig'; 
import { useAuth } from '../AuthContext'; 

export type UserMap = { [userId: string]: string };

export const useUserMap = () => {
    const [userMap, setUserMap] = useState<UserMap>({});
    const [loading, setLoading] = useState(true);
    const { user } = useAuth(); 

    useEffect(() => {
        // Eğer kullanıcı henüz giriş yapmadıysa sorgu yapma
        if (!user) {
            setLoading(false);
            return;
        }

        const usersCollectionRef = collection(db, "users");
        const q = query(usersCollectionRef);

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const newMap: UserMap = {};
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Kullanıcı adı yoksa ID'nin son 6 hanesini göster
                newMap[doc.id] = data.username || `...@${doc.id.substring(doc.id.length - 6)}`;
            });
            setUserMap(newMap);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching user map:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return { userMap, loading };
};