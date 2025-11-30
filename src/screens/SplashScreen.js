import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const SplashScreen = ({ onFinish, dataReady }) => {
    const { theme } = useTheme();
    
    // Animation Values
    const circleScale = useRef(new Animated.Value(0)).current;
    const titleOpacity = useRef(new Animated.Value(0)).current;
    const subtitleOpacity = useRef(new Animated.Value(0)).current;
    const containerOpacity = useRef(new Animated.Value(1)).current;
    const containerScale = useRef(new Animated.Value(1)).current;
    
    const [introComplete, setIntroComplete] = useState(false);

    useEffect(() => {
        // 1. Circle Expand
        Animated.timing(circleScale, {
            toValue: 40,
            duration: 1200,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true, // Native driver is safer for Web too (often polyfilled)
        }).start();

        // 2. Reveal Text Sequence
        Animated.sequence([
            Animated.delay(1000),
            Animated.timing(titleOpacity, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.delay(500),
            Animated.timing(subtitleOpacity, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            })
        ]).start(({ finished }) => {
            if (finished) {
                setIntroComplete(true);
            }
        });
    }, []);
    
    // 3. Exit Animation
    useEffect(() => {
        if (introComplete && dataReady) {
            Animated.parallel([
                Animated.timing(containerOpacity, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(containerScale, {
                    toValue: 1.5,
                    duration: 2000,
                    useNativeDriver: true,
                })
            ]).start(({ finished }) => {
                if (finished) {
                    onFinish();
                }
            });
        }
    }, [introComplete, dataReady]);

    // Safety Timeout
    useEffect(() => {
        if (dataReady) {
            const timer = setTimeout(() => {
                console.error('Splash screen safety timeout triggered - Forcing Exit');
                onFinish(); 
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [dataReady]);

    const circleStyle = {
        transform: [{ scale: circleScale }],
    };

    const titleStyle = {
        opacity: titleOpacity,
        transform: [{ 
            translateY: titleOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
            })
        }]
    };

    const subtitleStyle = {
        opacity: subtitleOpacity,
        transform: [{ 
            translateY: subtitleOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0]
            })
        }]
    };

    const containerStyle = {
        opacity: containerOpacity,
        transform: [{ scale: containerScale }]
    };

    return (
        <Animated.View style={[styles.container, containerStyle]}>
            {/* Initial Black Background */}
            <View style={styles.blackLayer} />
            
            {/* The Expanding Circle (Theme Background) */}
            <Animated.View style={[styles.circle, { backgroundColor: theme.colors.background }, circleStyle]} />
            
            {/* Content */}
            <View style={styles.contentContainer}>
                <Animated.Text style={[styles.title, { color: theme.colors.primary }, titleStyle]}>
                    Wish Me Not
                </Animated.Text>
                <Animated.Text style={[styles.subtitle, { color: theme.colors.text }, subtitleStyle]}>
                    Stop guessing, Start Gifting
                </Animated.Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999, 
        alignItems: 'center',
        justifyContent: 'center',
    },
    blackLayer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000000',
    },
    circle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        position: 'absolute',
    },
    contentContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        zIndex: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    subtitle: {
        fontSize: 20,
        textAlign: 'center',
        lineHeight: 30,
        fontStyle: 'italic',
    },
});

export default SplashScreen;
