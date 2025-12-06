import { createNavigationContainerRef } from '@react-navigation/native';

// Navigasyon işlemlerini component dışından yapabilmek için ref
export const navigationRef = createNavigationContainerRef<any>();

export function navigate(name: string, params?: any) {
    if (navigationRef.isReady()) {
        navigationRef.navigate(name, params);
    }
}