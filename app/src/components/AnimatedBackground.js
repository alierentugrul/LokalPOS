import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Dimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

const { width, height } = Dimensions.get('window');

const Blob = ({ size, color, delay, duration, startX, startY, toX, toY }) => {
  const animX = useRef(new Animated.Value(startX)).current;
  const animY = useRef(new Animated.Value(startY)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animate = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(animX, {
            toValue: toX,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(animX, {
            toValue: startX,
            duration: duration,
            useNativeDriver: true,
          })
        ]),
        Animated.sequence([
          Animated.timing(animY, {
            toValue: toY,
            duration: duration * 1.2,
            useNativeDriver: true,
          }),
          Animated.timing(animY, {
            toValue: startY,
            duration: duration * 1.2,
            useNativeDriver: true,
          })
        ]),
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.5,
            duration: duration * 0.8,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: duration * 0.8,
            useNativeDriver: true,
          })
        ])
      ]).start(() => animate());
    };

    setTimeout(() => animate(), delay);
  }, []);

  return (
    <Animated.View
      style={[
        styles.blob,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: [
            { translateX: animX },
            { translateY: animY },
            { scale: scale }
          ]
        }
      ]}
    />
  );
};

export default function AnimatedBackground() {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sabit Gradient Zemin */}
      <LinearGradient
        colors={[colors.background, colors.surface]}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Hareketli Yumuşak Blob'lar */}
      <Blob 
        size={width * 0.8} 
        color={colors.primary + (isDark ? '11' : '15')} // Altın sarısı
        delay={0}
        duration={15000}
        startX={-width * 0.2}
        startY={-height * 0.1}
        toX={width * 0.5}
        toY={height * 0.3}
      />
      
      <Blob 
        size={width * 0.9} 
        color={colors.cardBorderLight + (isDark ? '33' : '44')} // İkinci ton
        delay={2000}
        duration={18000}
        startX={width * 0.6}
        startY={height * 0.4}
        toX={-width * 0.3}
        toY={height * 0.8}
      />

      <Blob 
        size={width * 0.7} 
        color={colors.accent + (isDark ? '0C' : '11')} // Aksan ton
        delay={4000}
        duration={20000}
        startX={width * 0.2}
        startY={height * 0.7}
        toX={width * 0.8}
        toY={height * 0.2}
      />
      
      {/* Yarı saydam bir karartma katmanı */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background + '88' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    opacity: 0.8,
  }
});
