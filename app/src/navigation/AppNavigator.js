import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Alert, AppState, Modal, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer, DefaultTheme, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onAuthStateChanged, signOut, sendEmailVerification } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

import { auth } from '../config/firebase';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import CustomersScreen from '../screens/CustomersScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import CreditScreen from '../screens/CreditScreen';
import RevenueScreen from '../screens/RevenueScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AnimatedBackground from '../components/AnimatedBackground';

const Stack = createNativeStackNavigator();
const Tab = createMaterialTopTabNavigator();
const CustomerStack = createNativeStackNavigator();

function CustomersStackNavigator() {
  return (
    <CustomerStack.Navigator 
      screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <CustomerStack.Screen name="CustomersList" component={CustomersScreen} />
      <CustomerStack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
    </CustomerStack.Navigator>
  );
}

function MainTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 10;
  // MaterialTopTabs iç yapısı paddingleri tam yönetemediği için base height'ı 58'e çıkarıp paddingTop'ı kısıyoruz.
  const tabHeight = 58 + bottomPadding;

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <Tab.Navigator
        tabBarPosition="bottom"
        sceneContainerStyle={{ backgroundColor: 'transparent' }}
        screenOptions={({ route }) => ({
          swipeEnabled: true,
          animationEnabled: true,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.cardBorder,
            borderTopWidth: 1,
            height: tabHeight,
            paddingBottom: bottomPadding,
            paddingTop: 6,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 0,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: 'JetBrainsMono_400Regular',
            letterSpacing: 0.5,
            marginTop: 0,
            marginBottom: 2,
            textTransform: 'none',
          },
          tabBarIcon: ({ color, focused }) => {
            const icons = {
              'Müşteriler': focused ? 'people' : 'people-outline',
              'Veresiye': focused ? 'wallet' : 'wallet-outline',
              'Ciro': focused ? 'bar-chart' : 'bar-chart-outline',
              'Ayarlar': focused ? 'settings' : 'settings-outline',
            };
            return <Ionicons name={icons[route.name]} size={21} color={color} />;
          },
          tabBarIndicatorStyle: {
            backgroundColor: colors.primary,
            height: 2,
            borderTopLeftRadius: 2,
            borderTopRightRadius: 2,
            top: 0,
          },
        })}
      >
        <Tab.Screen 
          name="Müşteriler" 
          component={CustomersStackNavigator} 
          options={({ route }) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? 'CustomersList';
            return { swipeEnabled: routeName === 'CustomersList' };
          }}
        />
        <Tab.Screen 
          name="Veresiye" 
          component={CreditScreen} 
        />
        <Tab.Screen 
          name="Ciro" 
          component={RevenueScreen} 
        />
        <Tab.Screen 
          name="Ayarlar" 
          component={SettingsScreen} 
        />
      </Tab.Navigator>
    </View>
  );
}

export default function AppNavigator() {
  const [user, setUser] = useState(undefined);
  const [splashDone, setSplashDone] = useState(false);
  const { colors } = useTheme();

  const appState = useRef(AppState.currentState);
  const [isLocked, setIsLocked] = useState(false);
  const isAuthenticating = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u && !u.emailVerified) {
        Alert.alert(
          'E-posta Onayı Bekleniyor', 
          'Lütfen gelen kutunuzu kontrol edin ve e-posta adresinizi doğruladıktan sonra tekrar giriş yapın.',
          [
            { text: 'Tamam', onPress: () => { signOut(auth); setUser(null); } },
            { 
              text: 'Tekrar Gönder', 
              onPress: async () => {
                try {
                  await sendEmailVerification(u);
                  Alert.alert('Başarılı', 'Doğrulama maili tekrar gönderildi.');
                } catch (e) {
                  Alert.alert('Hata', 'Mail gönderilirken bir sorun oluştu. Daha sonra tekrar deneyin.');
                }
                signOut(auth);
                setUser(null);
              } 
            }
          ]
        );
      } else {
        setUser(u);
      }
    });
    return unsubscribe;
  }, []);

  const handleAuth = async () => {
    if (isAuthenticating.current) return;
    isAuthenticating.current = true;
    
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'LokalPOS Güvenlik Kilidi',
        fallbackLabel: 'Şifre Kullan',
      });
      if (result.success) {
        setIsLocked(false);
      }
    } else {
      setIsLocked(false);
    }
    
    // İşlem bittikten sonra kilidi aç
    isAuthenticating.current = false;
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      // SADECE background'dan active'e geçişte kilitle (inactive'den değil, çünkü Face ID inactive yapar)
      if (
        appState.current === 'background' && 
        nextAppState === 'active' && 
        user && 
        !isAuthenticating.current &&
        !isLocked
      ) {
        setIsLocked(true);
        // Otomatik tetikleme yerine kullanıcının "Kilidi Aç" butonuna basmasını bekleyebiliriz
        // veya burada handleAuth() diyebiliriz.
        handleAuth();
      }
      appState.current = nextAppState;
    });
    return () => {
      subscription.remove();
    };
  }, [user]);

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: 'transparent',
    },
  };

  return (
    <View style={{ flex: 1 }}>
      <AnimatedBackground />
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator 
          screenOptions={{ 
            headerShown: false, 
            animation: 'fade',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        >
          {!splashDone ? (
            <Stack.Screen name="Splash">
              {(props) => <SplashScreen {...props} onDone={() => setSplashDone(true)} />}
            </Stack.Screen>
          ) : user ? (
            <Stack.Screen name="Main" component={MainTabs} />
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {/* Güvenlik Kilidi Modalı */}
      <Modal visible={isLocked} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(5, 8, 10, 0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="lock-closed" size={64} color={colors.primary} style={{ marginBottom: 20 }} />
          <Text style={{ fontFamily: typography.bold, fontSize: 24, color: colors.text, marginBottom: 8 }}>Uygulama Kilitli</Text>
          <Text style={{ fontFamily: typography.regular, fontSize: 14, color: colors.textMuted, marginBottom: 40 }}>Güvenliğiniz için lütfen doğrulama yapın</Text>
          
          <TouchableOpacity 
            style={{ backgroundColor: colors.primary, paddingHorizontal: 30, paddingVertical: 14, borderRadius: 20 }}
            onPress={handleAuth}
          >
            <Text style={{ fontFamily: typography.bold, fontSize: 16, color: colors.textInverse }}>Kilidi Aç</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
