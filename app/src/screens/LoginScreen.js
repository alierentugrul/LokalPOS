import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../config/firebase';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import LottieView from 'lottie-react-native';

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  
  // Kayıt state'leri
  const [isRegister, setIsRegister] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmFocused, setConfirmFocused] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      shake();
      Alert.alert('Hata', 'E-posta ve şifre alanları boş bırakılamaz.');
      return;
    }
    
    if (isRegister) {
      if (password !== confirmPassword) {
        shake();
        Alert.alert('Hata', 'Şifreler eşleşmiyor.');
        return;
      }
      setLoading(true);
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await sendEmailVerification(userCredential.user);
        Alert.alert(
          'Kayıt Başarılı', 
          'Hesabınız oluşturuldu. Lütfen e-posta adresinize gönderilen doğrulama linkine tıklayarak hesabınızı onaylayın.'
        );
      } catch (error) {
        shake();
        let msg = 'Kayıt yapılamadı.';
        if (error.code === 'auth/email-already-in-use') msg = 'Bu e-posta adresi zaten kullanılıyor.';
        if (error.code === 'auth/invalid-email') msg = 'Geçersiz e-posta formatı.';
        if (error.code === 'auth/weak-password') msg = 'Şifre çok zayıf. En az 6 karakter olmalı.';
        Alert.alert('Kayıt Hatası', msg);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } catch (error) {
        shake();
        let msg = 'Giriş yapılamadı. Bilgilerinizi kontrol edin.';
        if (error.code === 'auth/user-not-found') msg = 'Bu e-posta ile kayıtlı kullanıcı bulunamadı.';
        if (error.code === 'auth/wrong-password') msg = 'Şifre hatalı.';
        if (error.code === 'auth/invalid-credential') msg = 'E-posta veya şifre hatalı.';
        if (error.code === 'auth/too-many-requests') msg = 'Çok fazla hatalı deneme. Lütfen bekleyin.';
        Alert.alert('Giriş Hatası', msg);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={isDark ? ['#05080A', colors.background, '#080E12'] : [colors.background, colors.surface, colors.background]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Geometrik arka plan */}
      <View style={styles.bgRing} />
      <View style={styles.bgCornerTL} />
      <View style={styles.bgCornerBR} />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[styles.inner, { transform: [{ translateX: shakeAnim }] }]}>
          {/* Logo */}
          <View style={[styles.logoWrap, { alignItems: 'center', justifyContent: 'center' }]}>
            <LottieView
              source={require('../../assets/tea_serving.json')}
              autoPlay
              loop
              style={{ width: 100, height: 100 }}
            />
          </View>

          {/* Başlık */}
          <Text style={styles.brand}>
            Lokal<Text style={styles.brandAccent}>POS</Text>
          </Text>
          <View style={styles.dividerRow}>
            <View style={styles.divLine} />
            <Text style={styles.divLabel}>{isRegister ? 'YENİ HESAP OLUŞTUR' : 'YÖNETİCİ GİRİŞİ'}</Text>
            <View style={styles.divLine} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* E-posta */}
            <View style={[styles.field, emailFocused && styles.fieldFocused]}>
              <Ionicons
                name="mail-outline"
                size={17}
                color={emailFocused ? colors.primary : colors.textMuted}
                style={styles.fieldIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="E-posta"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            {/* Şifre */}
            <View style={[styles.field, passFocused && styles.fieldFocused]}>
              <Ionicons
                name="lock-closed-outline"
                size={17}
                color={passFocused ? colors.primary : colors.textMuted}
                style={styles.fieldIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Şifre"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eye}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={17}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {isRegister && (
              <View style={[styles.field, confirmFocused && styles.fieldFocused]}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={17}
                  color={confirmFocused ? colors.primary : colors.textMuted}
                  style={styles.fieldIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Şifreyi Onayla"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setConfirmFocused(true)}
                  onBlur={() => setConfirmFocused(false)}
                />
              </View>
            )}

            {/* Buton */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleLogin}
              disabled={loading}
            >
              <LinearGradient
                colors={[colors.primaryLight, colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.btn, loading && { opacity: 0.7 }]}
              >
                {loading ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <>
                    <Text style={styles.btnText}>{isRegister ? 'Kayıt Ol' : 'Giriş Yap'}</Text>
                    <Ionicons name="arrow-forward" size={17} color={colors.textInverse} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={{ marginTop: 16, alignItems: 'center' }}
              onPress={() => setIsRegister(!isRegister)}
            >
              <Text style={{ fontFamily: typography.mono, fontSize: 12, color: colors.textMuted }}>
                {isRegister ? 'Zaten hesabın var mı? ' : 'Hesabın yok mu? '}
                <Text style={{ color: colors.primary, fontFamily: typography.monoBold }}>
                  {isRegister ? 'Giriş Yap' : 'Kayıt Ol'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>
            LokalPOS · v1.0
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  kav: { flex: 1, justifyContent: 'center' },
  bgRing: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    borderWidth: 1,
    borderColor: colors.primary + '12',
    top: -100,
    right: -80,
  },
  bgCornerTL: {
    position: 'absolute',
    top: 40,
    left: 20,
    width: 80,
    height: 80,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: colors.cardBorder,
    opacity: 0.6,
  },
  bgCornerBR: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    width: 80,
    height: 80,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.cardBorder,
    opacity: 0.6,
  },
  inner: {
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  logoWrap: { marginBottom: 20 },
  logoBox: {
    width: 76,
    height: 76,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '40',
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  logoEmoji: { fontSize: 38 },
  logoBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: 2,
    backgroundColor: colors.primary,
    opacity: 0.6,
  },
  brand: {
    fontFamily: typography.displayRegular,
    fontSize: 34,
    color: colors.text,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  brandAccent: {
    fontFamily: typography.displayBold,
    color: colors.primary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
    width: '100%',
  },
  divLine: { flex: 1, height: 1, backgroundColor: colors.cardBorder },
  divLabel: {
    fontFamily: typography.mono,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 2.5,
  },
  form: { width: '100%', gap: 12 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    height: 52,
  },
  fieldFocused: { borderColor: colors.primary },
  fieldIcon: { marginRight: 10 },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  eye: { padding: 4 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    height: 52,
    gap: 8,
    marginTop: 6,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 7,
  },
  btnText: {
    color: colors.textInverse,
    fontFamily: typography.displayBold,
    fontSize: 15,
    letterSpacing: 0.3,
  },
  footer: {
    marginTop: 36,
    fontFamily: typography.mono,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
});
