import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ onDone }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const dividerWidth = useRef(new Animated.Value(0)).current;
  const subOpacity = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      ]),
      Animated.timing(titleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(dividerWidth, { toValue: 120, duration: 250, useNativeDriver: false }),
      Animated.timing(subOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(containerOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={isDark ? ['#05080A', colors.background, '#080E12'] : [colors.background, colors.surface, colors.background]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', opacity: containerOpacity }]}>
        {/* Arka plan halka dekorasyonları */}
      <View style={styles.ring1} />
      <View style={styles.ring2} />
      <View style={styles.ring3} />

      {/* Logo bloğu */}
      <Animated.View
        style={[styles.logoBlock, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
      >
        <LottieView
          source={require('../../assets/tea_serving.json')}
          autoPlay
          loop
          style={{ width: 130, height: 130 }}
        />
      </Animated.View>

      {/* Başlık */}
      <Animated.View style={[styles.titleBlock, { opacity: titleOpacity }]}>
        <Text style={styles.titleLokal}>Lokal</Text>
        <Text style={styles.titlePos}>POS</Text>
      </Animated.View>

      {/* Çizgi */}
      <Animated.View style={[styles.divider, { width: dividerWidth }]} />

      {/* Alt yazı */}
      <Animated.Text style={[styles.subtitle, { opacity: subOpacity }]}>
        GALERİCİLER SİTESİ LOKALI
      </Animated.Text>

      {/* Alt köşe detayı */}
      <View style={styles.bottomMark}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>
      </Animated.View>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring1: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    opacity: 0.4,
  },
  ring2: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: colors.primary + '25',
    opacity: 0.6,
  },
  ring3: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: colors.primary + '18',
  },
  logoBlock: {
    marginBottom: 28,
  },
  logoInner: {
    width: 100,
    height: 100,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary + '50',
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  logoEmoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  logoAccentLine: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 2,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    opacity: 0.7,
  },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  titleLokal: {
    fontFamily: typography.displayRegular,
    fontSize: 44,
    color: colors.text,
    letterSpacing: 1,
    lineHeight: 52,
  },
  titlePos: {
    fontFamily: typography.displayBold,
    fontSize: 44,
    color: colors.primary,
    letterSpacing: 2,
    lineHeight: 52,
    marginLeft: 4,
  },
  divider: {
    height: 1.5,
    backgroundColor: colors.primary,
    opacity: 0.5,
    marginBottom: 14,
  },
  subtitle: {
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 3.5,
  },
  bottomMark: {
    position: 'absolute',
    bottom: 52,
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.cardBorderLight,
  },
});
