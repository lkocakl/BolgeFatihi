import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export type UserMap = { [userId: string]: string };

export const useUserMap = () => {
    const [userMap, setUserMap] = useState<UserMap>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const usersCollectionRef = collection(db, "users");
        const q = query(usersCollectionRef);

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const newMap: UserMap = {};
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Fallback to a masked ID if username is missing
                newMap[doc.id] = data.username || `...@${doc.id.substring(doc.id.length - 6)}`;
            });
            setUserMap(newMap);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching user map:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { userMap, loading };
};
