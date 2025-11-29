import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    withDelay, 
    runOnJS,
    Easing
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');

const SplashScreen = ({ onFinish }) => {
    const { theme } = useTheme();
    
    // Animation Values
    const circleScale = useSharedValue(0);
    const titleOpacity = useSharedValue(0);
    const subtitleOpacity = useSharedValue(0);
    const containerOpacity = useSharedValue(1);
    const containerScale = useSharedValue(1);

    useEffect(() => {
        // 1. Circle Expand (Scope Out) - Start from black, reveal theme background
        circleScale.value = withTiming(40, { duration: 1200, easing: Easing.out(Easing.exp) });

        // 2. Reveal Text Sequence
        titleOpacity.value = withDelay(1000, withTiming(1, { duration: 1000 }));
        subtitleOpacity.value = withDelay(2000, withTiming(1, { duration: 1000 }));
        
        // 3. Exit Animation (Zoom Out/Fade)
        // Total time roughly: 1200 (circle) + text reads (~3s) -> exit
        const EXIT_DELAY = 5000;

        containerOpacity.value = withDelay(EXIT_DELAY, withTiming(0, { duration: 800 }, (finished) => {
            if (finished) {
                runOnJS(onFinish)();
            }
        }));
        
        // "Zoom out" effect (scaling down creates a zoom out feel, or scaling up zoom in)
        // Request says "zoom out (or in)". Scaling up the splash screen while fading out gives a "flying through" zoom in effect.
        containerScale.value = withDelay(EXIT_DELAY, withTiming(1.5, { duration: 800 }));

    }, []);

    const circleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: circleScale.value }],
    }));

    const titleStyle = useAnimatedStyle(() => ({
        opacity: titleOpacity.value,
        transform: [{ translateY: (1 - titleOpacity.value) * 20 }]
    }));

    const subtitleStyle = useAnimatedStyle(() => ({
        opacity: subtitleOpacity.value,
        transform: [{ translateY: (1 - subtitleOpacity.value) * 20 }]
    }));

    const containerStyle = useAnimatedStyle(() => ({
        opacity: containerOpacity.value,
        transform: [{ scale: containerScale.value }]
    }));

    return (
        <Animated.View style={[styles.container, containerStyle]}>
            {/* Initial Black Background */}
            <View style={styles.blackLayer} />
            
            {/* The Expanding Circle (Theme Background) */}
            <Animated.View style={[styles.circle, { backgroundColor: theme.colors.background }, circleStyle]} />
            
            {/* Content */}
            <View style={styles.contentContainer}>
                <Animated.Text style={[styles.title, { color: theme.colors.primary }, titleStyle]}>
                    Welcome to Wish Me Not.
                </Animated.Text>
                <Animated.Text style={[styles.subtitle, { color: theme.colors.text }, subtitleStyle]}>
                    Where your friends don’t have to guess, and you don’t have to hope.
                </Animated.Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999, // Ensure on top
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
