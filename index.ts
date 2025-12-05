import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { tr, en } from './translations';

const RESOURCES = {
    tr: { translation: tr },
    en: { translation: en },
};

const LANGUAGE_DETECTOR = {
    type: 'languageDetector',
    async: true,
    detect: async (callback: (lang: string) => void) => {
        try {
            // 1. Önce kullanıcının seçtiği dili kontrol et
            const userLang = await AsyncStorage.getItem('user-language');
            if (userLang) {
                callback(userLang);
                return;
            }

            // 2. Yoksa telefonun dilini kontrol et
            // Expo 50+ için: Localization.getLocales()
            const deviceLang = Localization.getLocales()[0]?.languageCode;

            // Desteklenen dillerden biri mi? Değilse 'en' yap
            const bestLang = deviceLang === 'tr' ? 'tr' : 'en';

            callback(bestLang);
        } catch (error) {
            callback('en');
        }
    },
    init: () => { },
    cacheUserLanguage: async (language: string) => {
        try {
            await AsyncStorage.setItem('user-language', language);
        } catch (error) { }
    },
};

i18n
    // @ts-ignore
    .use(LANGUAGE_DETECTOR)
    .use(initReactI18next)
    .init({
        resources: RESOURCES,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // React zaten XSS koruması sağlar
        },
        react: {
            useSuspense: false // React Native'de loading ekranı için
        }
    });

export default i18n;