import React, { useState, useRef } from 'react';
import { 
    View, Text, StyleSheet, FlatList, Animated, 
    useWindowDimensions, TouchableOpacity, Image 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from './constants/theme';

// Tanıtım Kartları Verisi
const slides = [
    {
        id: '1',
        title: 'Koş ve Keşfet',
        description: 'Şehrini yeniden keşfet! Koşu ayakkabılarını giy, haritada rotanı çiz ve bölgeleri boyamaya başla.',
        icon: 'map-marker-path',
        color: '#4CAF50'
    },
    {
        id: '2',
        title: 'Bölgeleri Fethet',
        description: 'Sadece koşmak yetmez! Diğer kullanıcıların rotalarıyla kesişen yollar çizerek onların bölgelerini ele geçir.',
        icon: 'flag-variant',
        color: '#F44336'
    },
    {
        id: '3',
        title: 'Liderliğe Yüksel',
        description: 'En çok bölgeyi sen fethet, puanları topla ve liderlik tablosunda zirveye otur. Fatih sen ol!',
        icon: 'trophy',
        color: '#FFC107'
    }
];

const OnboardingScreen = ({ onFinish }: { onFinish: () => void }) => {
    const { width } = useWindowDimensions();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef<FlatList>(null);

    const viewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const handleNext = async () => {
        if (currentIndex < slides.length - 1) {
            slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            // Son slayttaysa bitir
            try {
                await AsyncStorage.setItem('@viewedOnboarding', 'true');
                onFinish();
            } catch (err) {
                console.log('Error @setItem: ', err);
            }
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#FFFFFF', '#F5F5F5']} style={StyleSheet.absoluteFill} />
            
            <View style={{ flex: 3 }}>
                <FlatList
                    data={slides}
                    renderItem={({ item }) => (
                        <View style={[styles.slide, { width }]}>
                            <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                                <MaterialCommunityIcons name={item.icon as any} size={100} color={item.color} />
                            </View>
                            <Text style={[styles.title, { color: item.color }]}>{item.title}</Text>
                            <Text style={styles.description}>{item.description}</Text>
                        </View>
                    )}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    bounces={false}
                    keyExtractor={(item) => item.id}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                        useNativeDriver: false,
                    })}
                    scrollEventThrottle={32}
                    onViewableItemsChanged={viewableItemsChanged}
                    viewabilityConfig={viewConfig}
                    ref={slidesRef}
                />
            </View>

            <View style={styles.footer}>
                {/* Paginator (Noktalar) */}
                <View style={styles.paginatorContainer}>
                    {slides.map((_, i) => {
                        const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [10, 20, 10],
                            extrapolate: 'clamp',
                        });
                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });

                        return (
                            <Animated.View 
                                key={i.toString()} 
                                style={[styles.dot, { width: dotWidth, opacity }]} 
                            />
                        );
                    })}
                </View>

                {/* Buton */}
                <TouchableOpacity style={styles.button} onPress={handleNext}>
                    <LinearGradient
                        colors={COLORS.primaryGradient as [string, string]}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.buttonText}>
                            {currentIndex === slides.length - 1 ? 'BAŞLA' : 'İLERLE'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    slide: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
    },
    iconContainer: {
        width: 200,
        height: 200,
        borderRadius: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: SPACING.m,
        textAlign: 'center',
    },
    description: {
        fontSize: FONT_SIZES.m,
        color: '#666',
        textAlign: 'center',
        paddingHorizontal: SPACING.m,
        lineHeight: 24,
    },
    footer: {
        flex: 1,
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xl,
        paddingBottom: 50,
        width: '100%',
    },
    paginatorContainer: {
        flexDirection: 'row',
        height: 64,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.primary,
        marginHorizontal: 8,
    },
    button: {
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    buttonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    }
});

export default OnboardingScreen;