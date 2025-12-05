import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { LIGHT_COLORS, DARK_COLORS } from './constants/theme';

type ThemeType = 'light' | 'dark';

interface ThemeContextType {
    theme: ThemeType;
    colors: typeof LIGHT_COLORS;
    isDark: boolean;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemScheme = useColorScheme(); // Telefonun ayarını al
    const [theme, setTheme] = useState<ThemeType>(systemScheme === 'dark' ? 'dark' : 'light');

    useEffect(() => {
        const loadTheme = async () => {
            const savedTheme = await AsyncStorage.getItem('user_theme');
            if (savedTheme) {
                setTheme(savedTheme as ThemeType);
            } else if (systemScheme) {
                setTheme(systemScheme);
            }
        };
        loadTheme();
    }, []);

    const toggleTheme = async () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        await AsyncStorage.setItem('user_theme', newTheme);
    };

    const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

    return (
        <ThemeContext.Provider value={{ theme, colors, isDark: theme === 'dark', toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};