import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export const useNetworkStatus = () => {
    const [isConnected, setIsConnected] = useState<boolean | null>(true);
    const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
            setIsConnected(state.isConnected);
            setIsInternetReachable(state.isInternetReachable);
        });

        return () => unsubscribe();
    }, []);

    // Bağlantı var mı? (Hem bağlı hem de internete erişebiliyor olmalı)
    const isOnline = isConnected && isInternetReachable !== false;

    return { isOnline, isConnected, isInternetReachable };
};