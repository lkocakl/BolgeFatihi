export const SPACING = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 40,
};

export const FONT_SIZES = {
    xs: 12,
    s: 14,
    m: 16,
    l: 20,
    xl: 24,
    xxl: 32,
};

export const SHADOWS = {
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
};

// [YENİ] Tema Renkleri
export const LIGHT_COLORS = {
    background: '#F4F4F1',
    surface: '#FFFFFF',
    text: '#212121',
    textSecondary: '#757575',
    primary: '#388E3C',
    primaryDark: '#1B5E20',
    secondary: '#1E88E5',
    secondaryDark: '#0D47A1',
    border: '#E0E0E0',
    error: '#D32F2F',
    success: '#4CAF50',
    warning: '#FFA000',
    tabBarActive: '#388E3C',
    tabBarInactive: 'gray',
    primaryGradient: ['#4CAF50', '#2E7D32'],
};

export const DARK_COLORS = {
    background: '#121212',
    surface: '#1E1E1E',
    text: '#E0E0E0',
    textSecondary: '#B0B0B0',
    primary: '#66BB6A', // Daha açık yeşil
    primaryDark: '#81C784',
    secondary: '#42A5F5',
    secondaryDark: '#64B5F6',
    border: '#333333',
    error: '#EF5350',
    success: '#66BB6A',
    warning: '#FFCA28',
    tabBarActive: '#66BB6A',
    tabBarInactive: '#757575',
    primaryGradient: ['#388E3C', '#1B5E20'], // Dark modda biraz daha koyu gradient
};

// Varsayılan (Eski kodların kırılmaması için)
export const COLORS = LIGHT_COLORS;